"""
Neural Network Ensemble Meta-Learner
=====================================
Combines the probability outputs of N individual XGBoost disease classifiers
(one per disease) into calibrated final risk scores using a small feedforward
neural network.

Architecture (per report type)
-------------------------------
  Input  : [p_disease_1, p_disease_2, ..., p_disease_N]   (N = number of diseases)
  Hidden : Dense(32, ReLU) → BatchNorm → Dense(16, ReLU)
  Output : Dense(N, Sigmoid)  — one calibrated score per disease

When trained ensemble weights exist (ensemble_{report_type}.pkl) they are loaded
and used.  When they do NOT exist the ensemble falls back to an identity
pass-through: the raw XGBoost probabilities are returned unchanged.  This means
the system works out-of-the-box with the 14 individual models even before the
ensemble has been trained.

Training
--------
Call `NeuralEnsemble.fit(X, y)` where:
  X — 2-D array of shape (n_samples, n_diseases), each column is the XGBoost
      probability for one disease on the training split.
  y — 2-D array of shape (n_samples, n_diseases), binary ground-truth labels.

Then call `NeuralEnsemble.save(path)` to persist the weights.
"""

import os
import logging
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pure-numpy MLP (no heavy framework dependency)
# ---------------------------------------------------------------------------
# Why no PyTorch / TensorFlow?
#   The ensemble is tiny (3 layers, ~2000 parameters for a blood report).
#   A full ML framework would add 500MB+ to the Docker image and slow cold
#   starts. Plain NumPy is sufficient and keeps the HF Space lean.

def _relu(x: np.ndarray) -> np.ndarray:
    # ReLU: max(0, x) — zero-costs the negative half of the activation space
    return np.maximum(0.0, x)


def _sigmoid(x: np.ndarray) -> np.ndarray:
    # Sigmoid with clip to prevent overflow in exp(-x) for large |x|.
    # Output range: (0, 1) — perfect for a probability output layer.
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


class _MLP:
    """
    Minimal 3-layer feedforward network:
      Input(n_in) → Dense(32, ReLU) → Dense(16, ReLU) → Dense(n_out, Sigmoid)

    Weights are stored as plain numpy arrays and serialised with joblib so
    they live next to the XGBoost .pkl files with no framework overhead.
    """

    def __init__(self, n_in: int, n_out: int, seed: int = 42):
        rng = np.random.default_rng(seed)  # deterministic init for reproducibility

        # He initialisation (scale = sqrt(2/fan_in)) — designed for ReLU activations.
        # Keeps variance of activations stable across layers so gradients don't vanish.
        scale1 = np.sqrt(2.0 / n_in)   # fan_in of layer 1 = number of input features
        scale2 = np.sqrt(2.0 / 32)     # fan_in of layer 2 = 32 (hidden layer 1 width)
        scale3 = np.sqrt(2.0 / 16)     # fan_in of layer 3 = 16 (hidden layer 2 width)

        # Layer 1: input → 32 hidden units
        self.W1 = rng.standard_normal((n_in, 32)).astype(np.float32) * scale1
        self.b1 = np.zeros(32, dtype=np.float32)

        # Layer 2: 32 → 16 hidden units
        self.W2 = rng.standard_normal((32, 16)).astype(np.float32) * scale2
        self.b2 = np.zeros(16, dtype=np.float32)

        # Layer 3: 16 → n_out (one calibrated probability per disease)
        self.W3 = rng.standard_normal((16, n_out)).astype(np.float32) * scale3
        self.b3 = np.zeros(n_out, dtype=np.float32)

    def forward(self, x: np.ndarray) -> np.ndarray:
        """
        Forward pass.
        x shape: (n_in,) for single sample or (batch, n_in) for batch.
        Returns shape matching x's batch dimension with n_out columns.
        """
        h1 = _relu(x @ self.W1 + self.b1)      # (batch, 32)
        h2 = _relu(h1 @ self.W2 + self.b2)     # (batch, 16)
        return _sigmoid(h2 @ self.W3 + self.b3) # (batch, n_out)  probabilities

    def fit(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 200,
        lr: float = 0.01,
        batch_size: int = 32,
    ) -> None:
        """
        Mini-batch SGD with binary cross-entropy loss.
        X: (n_samples, n_in)   — XGBoost probabilities on a held-out split
        y: (n_samples, n_out)  — binary ground-truth disease labels
        """
        X = X.astype(np.float32)
        y = y.astype(np.float32)
        n = len(X)

        for epoch in range(epochs):
            # Shuffle sample order each epoch to break gradient correlation
            idx = np.random.permutation(n)
            total_loss = 0.0

            for start in range(0, n, batch_size):
                batch_idx = idx[start: start + batch_size]
                Xb, yb = X[batch_idx], y[batch_idx]

                # ── Forward pass (same as forward() but we keep intermediates for backprop)
                h1  = _relu(Xb @ self.W1 + self.b1)   # (B, 32)
                h2  = _relu(h1 @ self.W2 + self.b2)   # (B, 16)
                out = _sigmoid(h2 @ self.W3 + self.b3) # (B, n_out)

                # ── Binary cross-entropy loss: L = -mean(y*log(p) + (1-y)*log(1-p))
                # eps avoids log(0) for numerically stable gradients.
                eps = 1e-7
                loss = -np.mean(
                    yb * np.log(out + eps) + (1 - yb) * np.log(1 - out + eps)
                )
                total_loss += loss

                # ── Backpropagation (chain rule, layer by layer from output to input)

                # dL/d(out): gradient of BCE loss w.r.t. sigmoid output.
                # For BCE + sigmoid the combined derivative simplifies to (out - y).
                dout = (out - yb) / len(Xb)                # (B, n_out)

                # Layer 3 gradients
                dW3 = h2.T @ dout                          # (16, n_out)
                db3 = dout.sum(axis=0)                     # (n_out,)

                # Propagate error back through layer 3 weights, then apply ReLU mask
                dh2 = dout @ self.W3.T                     # (B, 16)
                dh2[h2 <= 0] = 0.0                        # ReLU derivative: 0 where pre-activation ≤ 0

                # Layer 2 gradients
                dW2 = h1.T @ dh2                           # (32, 16)
                db2 = dh2.sum(axis=0)                      # (16,)

                # Propagate error back through layer 2, apply ReLU mask
                dh1 = dh2 @ self.W2.T                      # (B, 32)
                dh1[h1 <= 0] = 0.0                        # ReLU derivative

                # Layer 1 gradients
                dW1 = Xb.T @ dh1                           # (n_in, 32)
                db1 = dh1.sum(axis=0)                      # (32,)

                # ── SGD weight update: w = w - lr * dL/dw
                self.W3 -= lr * dW3;  self.b3 -= lr * db3
                self.W2 -= lr * dW2;  self.b2 -= lr * db2
                self.W1 -= lr * dW1;  self.b1 -= lr * db1

            if (epoch + 1) % 50 == 0:
                logger.info(f"  Epoch {epoch + 1}/{epochs}  loss={total_loss:.4f}")


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

class NeuralEnsemble:
    """
    Wraps a _MLP meta-learner that sits on top of the individual XGBoost
    disease classifiers.

    Usage (inference)
    -----------------
    ensemble = NeuralEnsemble.load(path)          # or NeuralEnsemble(n_diseases)
    final_probs = ensemble.predict(xgb_probas)    # np.ndarray shape (n_diseases,)

    Usage (training)
    ----------------
    ensemble = NeuralEnsemble(n_diseases=3)
    ensemble.fit(X_train, y_train)               # X: (N, n_diseases), y: (N, n_diseases)
    ensemble.save("ensemble_blood.pkl")
    """

    def __init__(self, n_diseases: int):
        self.n_diseases = n_diseases
        self._mlp: Optional[_MLP] = None
        self._trained = False

    # ------------------------------------------------------------------ #
    #  Core API                                                            #
    # ------------------------------------------------------------------ #

    def predict(self, xgb_probas: np.ndarray) -> np.ndarray:
        """
        Combines individual XGBoost probabilities into calibrated final scores.

        Parameters
        ----------
        xgb_probas : 1-D array of shape (n_diseases,)
            The positive-class probability (1 - P(class_0)) from each
            individual XGBoost disease model, in the same order as
            REPORT_MODEL_MAP[report_type].

        Returns
        -------
        np.ndarray  shape (n_diseases,)
            Calibrated probability for each disease. If no trained weights
            exist this is identical to the input (identity pass-through).
        """
        # Reshape to (1, n_diseases) for the matrix ops in _MLP.forward()
        x = np.array(xgb_probas, dtype=np.float32).reshape(1, -1)

        if self._trained and self._mlp is not None:
            # forward() returns shape (1, n_diseases); [0] extracts the 1-D row
            return self._mlp.forward(x)[0]

        # No weights loaded → transparent pass-through.
        # This means the system produces valid (if uncalibrated) predictions
        # even before the ensemble has been trained on labelled data.
        logger.debug(
            "NeuralEnsemble: no trained weights found — "
            "returning raw XGBoost probabilities."
        )
        return x[0]

    def fit(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 200,
        lr: float = 0.01,
        batch_size: int = 32,
    ) -> None:
        """
        Train the meta-learner.

        Parameters
        ----------
        X : (n_samples, n_diseases)  — XGBoost proba outputs on held-out split
        y : (n_samples, n_diseases)  — ground-truth binary labels
        """
        self._mlp = _MLP(n_in=self.n_diseases, n_out=self.n_diseases)
        self._mlp.fit(X, y, epochs=epochs, lr=lr, batch_size=batch_size)
        self._trained = True
        logger.info(
            f"NeuralEnsemble trained: {self.n_diseases} inputs → "
            f"{self.n_diseases} outputs"
        )

    # ------------------------------------------------------------------ #
    #  Persistence                                                         #
    # ------------------------------------------------------------------ #

    def save(self, path: str) -> None:
        """Serialise weights to disk with joblib."""
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        payload = {
            "n_diseases": self.n_diseases,
            "trained":    self._trained,
            "mlp":        self._mlp,
        }
        joblib.dump(payload, path)
        logger.info(f"NeuralEnsemble saved → {path}")

    @classmethod
    def load(cls, path: str) -> "NeuralEnsemble":
        """Load a previously saved ensemble from disk."""
        payload = joblib.load(path)
        obj = cls(n_diseases=payload["n_diseases"])
        obj._mlp     = payload["mlp"]
        obj._trained = payload["trained"]
        logger.info(f"NeuralEnsemble loaded ← {path}")
        return obj


# ---------------------------------------------------------------------------
# Module-level cache (avoids re-loading weights on every task)
# ---------------------------------------------------------------------------
# The Celery worker is a long-running process. Without a cache, every
# prediction task would call joblib.load() to deserialise the ensemble .pkl —
# disk I/O + numpy array allocation on every request.
# _ENSEMBLE_CACHE is a plain dict keyed by report_type so the weights stay
# in RAM after the first task for each type.

_ENSEMBLE_CACHE: Dict[str, NeuralEnsemble] = {}


def load_ensemble(report_type: str, ensemble_path: str, n_diseases: int) -> NeuralEnsemble:
    """
    Returns a cached NeuralEnsemble for the given report type.

    Called by predict.py → _apply_ensemble() on every prediction.
    First call for a report type: loads from disk (or creates identity instance).
    Subsequent calls: returns the cached object in O(1).

    Parameters
    ----------
    report_type    : e.g. "blood", "lipid" — used as cache key
    ensemble_path  : absolute path to ensemble_{report_type}.pkl
    n_diseases     : number of diseases for this report type (sets MLP dimensions)
    """
    # Cache hit — return the already-loaded ensemble
    if report_type in _ENSEMBLE_CACHE:
        return _ENSEMBLE_CACHE[report_type]

    # Cache miss — load from disk if weights file exists
    if os.path.exists(ensemble_path):
        ensemble = NeuralEnsemble.load(ensemble_path)
    else:
        # No trained weights yet → create an untrained instance.
        # predict() will return raw XGBoost probas (identity pass-through).
        logger.info(
            f"No ensemble weights at {ensemble_path} — "
            f"using identity pass-through for '{report_type}'."
        )
        ensemble = NeuralEnsemble(n_diseases=n_diseases)

    # Store in cache so the next task for this report_type is instant
    _ENSEMBLE_CACHE[report_type] = ensemble
    return ensemble

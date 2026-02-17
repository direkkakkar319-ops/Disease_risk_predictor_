class PredictionService:
    def predict(self, features: dict):
        # Implementation for XGBoost prediction
        return {"risk_score": 0.85}

prediction_service = PredictionService()

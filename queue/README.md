# Queue model

## `queue/tasks.py`
#### Functions added in the Tasks section:-
- process_medical_report()
Reads a medical report using PaddleOCR

- predict_disease_risk()
Runs the XGBoost ML model on the extracted lab values and saves the disease risk predictions to the database

- compare_report()
Compare two health reports and saves the results in the database

#### Functions added in Private database helper functions:-
- _update_report_status()
Updates the report status in the database ("processing" / "completed" / "failed")

- _save_ocr_results()
Saves the text and lab values extracted by OCR into the database

- _save_prediction()
Saves the risk scores and disease predictions made by the XGBoost model

- _get_report_data()
Fetches two reports from the database so they can be compared

- _save_comparison()
Saves the finished comparison result back to the database

## `queue/celery.py`
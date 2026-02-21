from paddle_ocr import PaddleOCR
ocr  = PaddleOCR(use_angle_cls = True, lang = 'en')

def extract_text_from_report(path):#here will put the image path
    results = ocr.ocr(path, cls=True)
    extracted_text = []
    for line in results:
        for word_info in line:
            text = word_info[-1][0]
            extracted_text.append(text)
    return "\n".join(extracted_text)
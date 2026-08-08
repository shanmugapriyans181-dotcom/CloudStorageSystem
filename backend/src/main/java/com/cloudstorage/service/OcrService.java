package com.cloudstorage.service;

import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.File;

@Service
@Slf4j
public class OcrService {

    private final Tesseract tesseract;

    public OcrService() {
        Tesseract instance = null;
        try {
            instance = new Tesseract();
            File tessDataFolder = new File("./tessdata");
            if (!tessDataFolder.exists()) {
                tessDataFolder = new File("backend/tessdata");
            }
            if (tessDataFolder.exists()) {
                instance.setDatapath(tessDataFolder.getAbsolutePath());
            }
            instance.setLanguage("eng");
            log.info("OcrService initialized successfully with Tessdata folder: {}", tessDataFolder.getAbsolutePath());
        } catch (Throwable e) {
            log.warn("OcrService: Native Tesseract initialization failed (will fallback cleanly if unavailable): {}", e.getMessage());
        }
        this.tesseract = instance;
    }

    public String extractTextFromImage(File imageFile) {
        if (tesseract == null || imageFile == null || !imageFile.exists()) {
            return "";
        }
        try {
            log.info("Running local Tesseract OCR on image: {}", imageFile.getName());
            return tesseract.doOCR(imageFile).trim();
        } catch (Throwable e) {
            log.error("Failed to run OCR on image: {}", imageFile.getName(), e);
            return "";
        }
    }

    public String extractTextFromScannedPdf(File pdfFile) {
        if (tesseract == null || pdfFile == null || !pdfFile.exists()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            int pageCount = Math.min(document.getNumberOfPages(), 5);
            for (int page = 0; page < pageCount; page++) {
                BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 150);
                String text = tesseract.doOCR(bim);
                if (text != null) {
                    sb.append(text.trim()).append("\n");
                }
            }
        } catch (Throwable e) {
            log.error("Failed to extract OCR text from scanned PDF: {}", pdfFile.getName(), e);
        }
        return sb.toString().trim();
    }
}

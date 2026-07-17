package com.cloudstorage.service;

import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

@Service
@Slf4j
public class OcrService {

    private final Tesseract tesseract;

    public OcrService() {
        this.tesseract = new Tesseract();
        // Set datapath to ./tessdata directory
        File tessDataFolder = new File("./tessdata");
        if (!tessDataFolder.exists()) {
            tessDataFolder = new File("backend/tessdata");
        }
        this.tesseract.setDatapath(tessDataFolder.getAbsolutePath());
        this.tesseract.setLanguage("eng");
        log.info("OcrService initialized with Tessdata folder: {}", tessDataFolder.getAbsolutePath());
    }

    public String extractTextFromImage(File imageFile) {
        if (imageFile == null || !imageFile.exists()) {
            return "";
        }
        try {
            log.info("Running local Tesseract OCR on image: {}", imageFile.getName());
            return tesseract.doOCR(imageFile).trim();
        } catch (TesseractException e) {
            log.error("Failed to run OCR on image: {}", imageFile.getName(), e);
            return "";
        }
    }

    public String extractTextFromScannedPdf(File pdfFile) {
        if (pdfFile == null || !pdfFile.exists()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        try (PDDocument document = PDDocument.load(pdfFile)) {
            log.info("Running Tesseract OCR on scanned PDF: {} (Pages: {})", pdfFile.getName(), document.getNumberOfPages());
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            int pages = document.getNumberOfPages();
            for (int page = 0; page < pages; page++) {
                // Render image from PDF page
                BufferedImage bim = pdfRenderer.renderImageWithDPI(page, 150);
                try {
                    String pageText = tesseract.doOCR(bim);
                    if (pageText != null) {
                        sb.append(pageText.trim()).append("\n");
                    }
                } catch (TesseractException e) {
                    log.error("OCR failed on page {} of PDF: {}", page, pdfFile.getName(), e);
                }
            }
        } catch (IOException e) {
            log.error("Failed to load PDF for OCR: {}", pdfFile.getName(), e);
        }
        return sb.toString().trim();
    }
}

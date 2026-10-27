package com.immersivemenu.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

class QrCodeServiceTest {
    private final QrCodeService qrCodes = new QrCodeService();

    @Test
    void createsPngForConfiguredMenuUrl() throws Exception {
        byte[] png = qrCodes.createPng("https://menu.example/cafe/cafe-aroma");

        assertThat(png).startsWith((byte) 0x89, (byte) 0x50, (byte) 0x4e, (byte) 0x47);
    }

    @Test
    void createsPrintablePdfWithCafeAndQrPage() throws Exception {
        byte[] pdf = qrCodes.createPrintablePdf("Cafe Aroma", "https://menu.example/cafe/cafe-aroma");

        try (var document = Loader.loadPDF(pdf)) {
            assertThat(document.getNumberOfPages()).isEqualTo(1);
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Cafe Aroma", "https://menu.example/cafe/cafe-aroma");
        }
    }
}

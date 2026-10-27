package com.immersivemenu.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Normalizer;
import javax.imageio.ImageIO;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.springframework.stereotype.Service;

@Service
public class QrCodeService {
    public byte[] createPng(String url) throws IOException {
        try {
            var matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 640, 640);
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", output);
            return output.toByteArray();
        } catch (com.google.zxing.WriterException exception) {
            throw new IllegalStateException("Could not encode the cafe menu URL as a QR code", exception);
        }
    }

    public byte[] createPrintablePdf(String cafeName, String url) throws IOException {
        BufferedImage qr = ImageIO.read(new ByteArrayInputStream(createPng(url)));
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            document.addPage(page);
            var image = LosslessFactory.createFromImage(document, qr);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 22);
                content.newLineAtOffset(72, 690);
                content.showText(toPdfText(cafeName));
                content.endText();

                float imageSize = 360;
                content.drawImage(image, (page.getMediaBox().getWidth() - imageSize) / 2, 270, imageSize, imageSize);

                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                content.newLineAtOffset(72, 235);
                content.showText("Scan to explore the menu");
                content.endText();

                content.beginText();
                content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9);
                content.newLineAtOffset(72, 215);
                for (int start = 0; start < url.length(); start += 100) {
                    content.showText(url.substring(start, Math.min(start + 100, url.length())));
                    content.newLineAtOffset(0, -12);
                }
                content.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private static String toPdfText(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^\\x20-\\x7E]", "?");
    }
}

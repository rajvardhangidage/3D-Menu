package com.immersivemenu.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import java.io.IOException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CloudinaryStorageService {
    private static final Logger logger = LoggerFactory.getLogger(CloudinaryStorageService.class);
    private static final long MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
    private static final String MANAGED_FOLDER = "immersive-menu/";
    private final Cloudinary cloudinary;
    private final String cloudName;
    private final String apiKey;
    private final String apiSecret;

    public CloudinaryStorageService(
            Cloudinary cloudinary,
            @Value("${app.cloudinary.cloud-name}") String cloudName,
            @Value("${app.cloudinary.api-key}") String apiKey,
            @Value("${app.cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = cloudinary;
        this.cloudName = cloudName;
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    public ImageAsset uploadImage(MultipartFile image) throws IOException {
        if (cloudName.isBlank() || apiKey.isBlank() || apiSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image uploads are not configured");
        }
        if (image.getSize() > MAX_IMAGE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded image exceeds the 10 MB limit");
        }
        if (image.isEmpty() || image.getContentType() == null || !isImageContent(image)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A valid PNG, JPEG, GIF, or WebP image is required");
        }
        Map<?, ?> result = cloudinary.uploader().upload(image.getBytes(),
                ObjectUtils.asMap("resource_type", "image", "folder", "immersive-menu"));
        Object publicIdValue = result.get("public_id");
        if (!(publicIdValue instanceof String publicId) || !publicId.startsWith(MANAGED_FOLDER)) {
            throw new IllegalStateException("Cloudinary did not return a managed image identifier");
        }
        String optimizedUrl = cloudinary.url().secure(true)
                .transformation(new Transformation().quality("auto").fetchFormat("auto")
                        .crop("limit").width(1600).height(1600))
                .generate(publicId);
        if (optimizedUrl == null || optimizedUrl.isBlank()) {
            throw new IllegalStateException("Cloudinary did not return a secure image URL");
        }
        return new ImageAsset(optimizedUrl, publicId);
    }

    public void deleteImage(String publicId) throws IOException {
        if (publicId == null || publicId.isBlank()) return;
        if (!publicId.startsWith(MANAGED_FOLDER)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image identifier is not managed by this application");
        }
        Map<?, ?> result = cloudinary.uploader().destroy(publicId,
                ObjectUtils.asMap("resource_type", "image", "invalidate", true));
        Object status = result.get("result");
        if (!"ok".equals(status) && !"not found".equals(status)) {
            throw new IOException("Cloudinary could not delete image " + publicId + ": " + status);
        }
    }

    public void deleteImageAfterCommit(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        deleteImage(publicId);
                    } catch (IOException | RuntimeException exception) {
                        logger.error("Could not delete Cloudinary image {}", publicId, exception);
                    }
                }
            });
        } else {
            try {
                deleteImage(publicId);
            } catch (IOException exception) {
                throw new IllegalStateException("Could not delete Cloudinary image " + publicId, exception);
            }
        }
    }

    private static boolean isImageContent(MultipartFile image) throws IOException {
        String contentType = image.getContentType();
        byte[] header;
        try (var input = image.getInputStream()) {
            header = input.readNBytes(12);
        }
        return switch (contentType) {
            case "image/png" -> header.length >= 8
                    && header[0] == (byte) 0x89 && header[1] == 0x50 && header[2] == 0x4e && header[3] == 0x47
                    && header[4] == 0x0d && header[5] == 0x0a && header[6] == 0x1a && header[7] == 0x0a;
            case "image/jpeg" -> header.length >= 3
                    && header[0] == (byte) 0xff && header[1] == (byte) 0xd8 && header[2] == (byte) 0xff;
            case "image/gif" -> header.length >= 6
                    && header[0] == 'G' && header[1] == 'I' && header[2] == 'F'
                    && header[3] == '8' && (header[4] == '7' || header[4] == '9') && header[5] == 'a';
            case "image/webp" -> header.length >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
    }

    public record ImageAsset(String secureUrl, String publicId) {}
}

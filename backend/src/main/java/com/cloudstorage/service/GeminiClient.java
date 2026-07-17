package com.cloudstorage.service;

import lombok.extern.slf4j.Slf4j;
import com.cloudstorage.entity.AdminSetting;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
@Slf4j
public class GeminiClient {

    @Value("${app.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${app.ai.gemini.model-text:gemini-3.5-flash}")
    private String textModel;

    @Value("${app.ai.gemini.model-embedding:text-embedding-004}")
    private String embeddingModel;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.cloudstorage.repository.AdminSettingRepository adminSettingRepository;

    private final RestTemplate restTemplate;

    public GeminiClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000); // 15 seconds
        factory.setReadTimeout(30000);    // 30 seconds
        this.restTemplate = new RestTemplate(factory);
    }

    private String getEffectiveApiKey() {
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("GEMINI_API_KEY")) {
            return apiKey.trim();
        }
        try {
            if (adminSettingRepository != null) {
                List<AdminSetting> settings = adminSettingRepository.findAll();
                if (!settings.isEmpty()) {
                    String dbKey = settings.get(0).getGeminiApiKey();
                    if (dbKey != null && !dbKey.trim().isEmpty()) {
                        return dbKey.trim();
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to load Gemini API key from database", e);
        }
        return null;
    }

    public boolean isConfigured() {
        String key = getEffectiveApiKey();
        return key != null && !key.isEmpty();
    }

    public boolean checkInternetConnection() {
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress("generativelanguage.googleapis.com", 443), 2000);
            return true;
        } catch (java.io.IOException e) {
            log.warn("Gemini connection test failed: No internet connection");
            return false;
        }
    }

    /**
     * Call the Gemini model to generate content for a text prompt.
     */
    public String generateContent(String prompt) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null) {
            log.warn("Gemini API key is not configured. Falling back.");
            return null;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + textModel + ":generateContent?key=" + effectiveKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload:
            // { "contents": [{ "parts": [{ "text": "prompt" }] }] }
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", prompt);

            Map<String, Object> partsObj = new HashMap<>();
            partsObj.put("parts", Collections.singletonList(textPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(partsObj));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map body = response.getBody();
                List candidates = (List) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List parts = (List) content.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map part = (Map) parts.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error calling Gemini GenerateContent API: ", e);
        }
        return null;
    }

    /**
     * Call the Gemini model to generate content for a prompt with multimodal media.
     */
    public String generateContentWithMedia(String prompt, String mimeType, String base64Data) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null) {
            log.warn("Gemini API key is not configured. Falling back.");
            return null;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + textModel + ":generateContent?key=" + effectiveKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload:
            // { "contents": [{ "parts": [{ "text": "prompt" }, { "inlineData": { "mimeType": "...", "data": "..." } }] }] }
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", prompt);

            Map<String, Object> inlineData = new HashMap<>();
            inlineData.put("mimeType", mimeType);
            inlineData.put("data", base64Data);

            Map<String, Object> mediaPart = new HashMap<>();
            mediaPart.put("inlineData", inlineData);

            List<Map<String, Object>> parts = new ArrayList<>();
            parts.add(textPart);
            parts.add(mediaPart);

            Map<String, Object> partsObj = new HashMap<>();
            partsObj.put("parts", parts);

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(partsObj));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map body = response.getBody();
                List candidates = (List) body.get("candidates");
                if (candidates != null && !candidates.isEmpty()) {
                    Map candidate = (Map) candidates.get(0);
                    Map content = (Map) candidate.get("content");
                    if (content != null) {
                        List pParts = (List) content.get("parts");
                        if (pParts != null && !pParts.isEmpty()) {
                            Map part = (Map) pParts.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error calling Gemini GenerateContent with media: ", e);
        }
        return null;
    }

    /**
     * Call the Gemini Embedding API to generate a 768-dimension vector.
     */
    public float[] getEmbedding(String text) {
        String effectiveKey = getEffectiveApiKey();
        if (effectiveKey == null) {
            return null;
        }

        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/" + embeddingModel + ":embedContent?key=" + effectiveKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload:
            // { "model": "models/text-embedding-004", "content": { "parts": [{ "text": "text" }] } }
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", text);

            Map<String, Object> partsObj = new HashMap<>();
            partsObj.put("parts", Collections.singletonList(textPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("model", "models/" + embeddingModel);
            payload.put("content", partsObj);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map body = response.getBody();
                Map embedding = (Map) body.get("embedding");
                if (embedding != null) {
                    List valuesList = (List) embedding.get("values");
                    if (valuesList != null) {
                        float[] vector = new float[valuesList.size()];
                        for (int i = 0; i < valuesList.size(); i++) {
                            vector[i] = ((Number) valuesList.get(i)).floatValue();
                        }
                        return vector;
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error calling Gemini Embedding API: ", e);
        }
        return null;
    }
}

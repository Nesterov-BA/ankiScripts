#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// ----------------------------------------------------------------------
// Helper functions for string manipulation
// ----------------------------------------------------------------------

// Replace all occurrences of 'from' with 'to' in 'str'
std::string replace_all(const std::string& str, const std::string& from, const std::string& to) {
    if (from.empty()) return str;
    std::string result = str;
    size_t pos = 0;
    while ((pos = result.find(from, pos)) != std::string::npos) {
        result.replace(pos, from.length(), to);
        pos += to.length();
    }
    return result;
}

// Split a string by a delimiter, returns vector of tokens
std::vector<std::string> split(const std::string& s, const std::string& delimiter) {
    std::vector<std::string> tokens;
    size_t start = 0, end;
    while ((end = s.find(delimiter, start)) != std::string::npos) {
        tokens.push_back(s.substr(start, end - start));
        start = end + delimiter.length();
    }
    tokens.push_back(s.substr(start));
    return tokens;
}

// Trim leading and trailing whitespace (including \r, \n, \t)
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r\f\v");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r\f\v");
    return str.substr(first, last - first + 1);
}

// ----------------------------------------------------------------------
// libcurl callback to write response into a std::string
// ----------------------------------------------------------------------
size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* output) {
    size_t total = size * nmemb;
    output->append(static_cast<char*>(contents), total);
    return total;
}

// ----------------------------------------------------------------------
// AnkiConnect invocation
// ----------------------------------------------------------------------
json anki_connect_invoke(const std::string& action, int version, const json& params = json::object()) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }

    // Build payload
    json payload;
    payload["action"] = action;
    payload["version"] = version;
    payload["params"] = params;

    std::string payload_str = payload.dump();
    std::string response_str;

    // Set libcurl options
    curl_easy_setopt(curl, CURLOPT_URL, "http://127.0.0.1:8765");
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload_str.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, payload_str.size());

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_str);

    // Perform the request
    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        throw std::runtime_error(std::string("CURL error: ") + curl_easy_strerror(res));
    }

    // Parse JSON response
    json response = json::parse(response_str);
    if (response.contains("error") && !response["error"].is_null()) {
        throw std::runtime_error("AnkiConnect error: " + response["error"].get<std::string>());
    }
    if (!response.contains("result")) {
        throw std::runtime_error("Missing 'result' field in AnkiConnect response");
    }
    return response["result"];
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------
int main() {
    try {
        // 1. Get note IDs from deck "Kanji"
        std::cout << "Fetching note IDs from deck 'Kanji'...\n";
        json ids_json = anki_connect_invoke("findNotes", 5, {{"query", "deck:Kanji"}});
        std::vector<int> ids = ids_json.get<std::vector<int>>();
        std::cout << "Found " << ids.size() << " notes.\n";

        // 2. Get note details
        std::cout << "Fetching note details...\n";
        json notes = anki_connect_invoke("notesInfo", 5, {{"notes", ids}});

        // 3. Process each note
        json result = json::object();
        size_t total = notes.size();

        for (size_t i = 0; i < total; ++i) {
            // Progress indicator
            std::cout << "\rProcessing note " << (i+1) << "/" << total << std::flush;

            const json& note = notes[i];

            // Extract English field (HTML content)
            std::string english = note["fields"]["English"]["value"];

            // ---- Replicate Python logic ----
            // Split by <li>
            std::vector<std::string> defin = split(english, "<li>");

            if (defin.size() == 1) {
                // Single definition case
                std::string d = defin[0];
                d = replace_all(d, "<div style=\"text-align: left;\" class=\"yomitan-glossary\">", "");
                d = replace_all(d, "</div>", "");
                d = replace_all(d, "<div style=\"text-align: center;\" class=\"yomitan-glossary\">", "");

                // Split by comma, take first part, then split by semicolon
                std::vector<std::string> comma_parts = split(d, ",");
                std::string first_part = comma_parts.empty() ? "" : comma_parts[0];
                std::vector<std::string> semicolon_parts = split(first_part, ";");

                // Trim each part
                for (auto& s : semicolon_parts) {
                    s = trim(s);
                }
                defin = semicolon_parts;
            } else {
                // Multiple definitions (list)
                for (auto& s : defin) {
                    s = replace_all(s, "</li>", "");
                    s = replace_all(s, "</ol></div>", "");
                    s = replace_all(s, "<br>", "");
                    s = replace_all(s, "&#x27;", "'");
                    s = trim(s);
                }
                // Remove the first element (empty or leading text)
                if (!defin.empty()) {
                    defin.erase(defin.begin());
                }
            }

            // Get readings and kanji character
            std::string onyomi = note["fields"]["Onyomi"]["value"];
            std::string kunyomi = note["fields"]["Kunyomi"]["value"];
            std::string kanji_char = note["fields"]["Kanji"]["value"];

            // Build entry
            json entry;
            entry["on_readings"] = onyomi;
            entry["kun_readings"] = kunyomi;
            entry["meanings"] = defin;

            result[kanji_char] = entry;
        }
        std::cout << "\nDone.\n";

        // 4. Write output to kanji.json
        std::ofstream out("kanji.json");
        if (!out.is_open()) {
            throw std::runtime_error("Could not open kanji.json for writing");
        }
        out << result.dump(4) << std::endl;
        std::cout << "Written to kanji.json\n";

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
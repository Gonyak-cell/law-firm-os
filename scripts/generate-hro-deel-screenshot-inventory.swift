#!/usr/bin/env swift
import Foundation
import ImageIO
import Vision

struct FeatureRule {
  let id: String
  let keywords: [String]
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceDir = root.appendingPathComponent("Law Firm OS UI/Deel web Jan 2026")
let ledgerURL = root.appendingPathComponent("docs/hro-deel-parity/crosswalk-ledger.json")
let outputJSON = root.appendingPathComponent("docs/hro-deel-parity/screenshot-inventory.json")
let outputMD = root.appendingPathComponent("docs/hro-deel-parity/screenshot-inventory.md")

let rules: [FeatureRule] = [
  FeatureRule(id: "people-directory-profile", keywords: ["people", "add people", "employee", "contractor", "profile", "groups", "team members", "worker"]),
  FeatureRule(id: "people-documents-compliance", keywords: ["document", "documents", "compliance", "template", "templates", "contract", "agreement"]),
  FeatureRule(id: "time-off-attendance-approvals", keywords: ["time off", "leave", "vacation", "attendance", "tracker", "overtime", "approval", "approvals"]),
  FeatureRule(id: "recruiting-lifecycle-candidate", keywords: ["talent", "job", "jobs", "hiring", "candidate", "onboarding", "offboarding", "hire"]),
  FeatureRule(id: "people-analytics-ai", keywords: ["dashboard", "dashboards", "report", "reports", "insights", "analytics", "custom ai", "ai agents", "workforce insights"]),
  FeatureRule(id: "payroll-export-boundary", keywords: ["payroll", "global payroll", "pay your team", "payment", "payments", "payslip", "tax", "salary", "wage", "compensation"]),
  FeatureRule(id: "workforce-planning-bulk-edit", keywords: ["workforce planning", "bulk edit", "bulk import", "bulk", "job request", "job requests", "referral", "referrals", "headcount"]),
  FeatureRule(id: "equity-benefits-immigration-background", keywords: ["equity", "benefits", "benefit", "immigration", "background check", "background checks", "visa", "mobility", "insurance"]),
  FeatureRule(id: "engagement-learning-performance", keywords: ["learning", "review", "reviews", "goals", "career", "survey", "surveys", "performance", "engagement"]),
  FeatureRule(id: "it-assets-apps-admin-settings", keywords: ["it assets", "asset", "assets", "apps", "slack", "notifications", "roles", "permissions", "custom branding", "device", "equipment", "integrations"])
]

func die(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

func loadLedgerFeatureMeta() throws -> [String: [String: Any]] {
  let data = try Data(contentsOf: ledgerURL)
  guard
    let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
    let features = object["feature_crosswalk"] as? [[String: Any]]
  else {
    die("Unable to read feature_crosswalk from \(ledgerURL.path)")
  }

  var meta: [String: [String: Any]] = [:]
  for feature in features {
    guard let id = feature["id"] as? String else { continue }
    meta[id] = [
      "lawos_status": feature["lawos_status"] ?? NSNull(),
      "next_tuw": feature["next_tuw"] ?? NSNull(),
      "risk_class": feature["risk_class"] ?? NSNull(),
      "deel_feature": feature["deel_feature"] ?? NSNull()
    ]
  }
  return meta
}

func screenshotId(_ url: URL) -> Int {
  let name = url.deletingPathExtension().lastPathComponent
  let parts = name.split(separator: " ")
  return Int(parts.last ?? "-1") ?? -1
}

func imageMetadata(_ url: URL) -> (width: Int, height: Int, image: CGImage)? {
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    return nil
  }
  return (image.width, image.height, image)
}

func recognizedTextLines(from image: CGImage) throws -> [String] {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["en-US"]

  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  try handler.perform([request])
  return (request.results ?? []).compactMap { observation in
    observation.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines)
  }.filter { !$0.isEmpty }
}

func matches(for text: String, featureMeta: [String: [String: Any]]) -> [[String: Any]] {
  let lower = text.lowercased()
  return rules.compactMap { rule in
    let matchedKeywords = rule.keywords.filter { lower.contains($0.lowercased()) }
    if matchedKeywords.isEmpty { return nil }
    return [
      "feature_id": rule.id,
      "score": matchedKeywords.count,
      "matched_keywords": matchedKeywords,
      "lawos_status": featureMeta[rule.id]?["lawos_status"] ?? NSNull(),
      "next_tuw": featureMeta[rule.id]?["next_tuw"] ?? NSNull(),
      "risk_class": featureMeta[rule.id]?["risk_class"] ?? NSNull()
    ]
  }.sorted {
    let left = $0["score"] as? Int ?? 0
    let right = $1["score"] as? Int ?? 0
    if left == right {
      return ($0["feature_id"] as? String ?? "") < ($1["feature_id"] as? String ?? "")
    }
    return left > right
  }
}

func markdownEscape(_ value: String) -> String {
  value.replacingOccurrences(of: "|", with: "\\|").replacingOccurrences(of: "\n", with: " ")
}

do {
  let featureMeta = try loadLedgerFeatureMeta()
  let files = try FileManager.default.contentsOfDirectory(at: sourceDir, includingPropertiesForKeys: nil)
    .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) }
    .sorted { screenshotId($0) < screenshotId($1) }

  var rows: [[String: Any]] = []
  var featureCounts: [String: Int] = [:]
  var statusCounts: [String: Int] = [:]
  var peopleRelatedCount = 0

  for file in files {
    guard let metadata = imageMetadata(file) else {
      die("Unable to load image: \(file.path)")
    }
    let lines = try recognizedTextLines(from: metadata.image)
    let text = lines.joined(separator: "\n")
    let matchedFeatures = matches(for: text, featureMeta: featureMeta)
    let primary = matchedFeatures.first
    let primaryFeatureId = primary?["feature_id"] as? String
    let primaryStatus = primary?["lawos_status"] as? String
    let primaryTuw = primary?["next_tuw"] as? String
    let peopleRelated = !matchedFeatures.isEmpty

    if peopleRelated { peopleRelatedCount += 1 }
    if let primaryFeatureId { featureCounts[primaryFeatureId, default: 0] += 1 }
    if let primaryStatus { statusCounts[primaryStatus, default: 0] += 1 }

    rows.append([
      "screenshot_id": screenshotId(file),
      "file": sourceDir.lastPathComponent + "/" + file.lastPathComponent,
      "pixel_width": metadata.width,
      "pixel_height": metadata.height,
      "ocr_engine": "apple_vision_vnrecognizetextrequest",
      "ocr_line_count": lines.count,
      "ocr_excerpt": String(text.prefix(360)),
      "ocr_text": lines,
      "people_related": peopleRelated,
      "primary_feature_id": primaryFeatureId ?? "non_people_reference",
      "primary_lawos_status": primaryStatus ?? "not_people_related",
      "primary_next_tuw": primaryTuw ?? NSNull(),
      "matched_features": matchedFeatures,
      "verification_tier": peopleRelated ? "ocr_keyword_feature_crosswalk" : "ocr_no_people_keyword_match"
    ])

    if rows.count % 25 == 0 {
      FileHandle.standardError.write(Data("processed \(rows.count)/\(files.count)\n".utf8))
    }
  }

  let inventory: [String: Any] = [
    "schema_version": "hro.deel_parity.screenshot_inventory.v1",
    "program_id": "HRO-DEEL-PARITY",
    "generated_at": ISO8601DateFormatter().string(from: Date()),
    "source_dir": "Law Firm OS UI/Deel web Jan 2026",
    "source_file_count": files.count,
    "people_related_count": peopleRelatedCount,
    "non_people_reference_count": files.count - peopleRelatedCount,
    "ocr_engine": "apple_vision_vnrecognizetextrequest",
    "classification_policy": "Deterministic OCR keyword matching against feature_crosswalk ids. Rows may match multiple feature families; primary_feature_id is the highest keyword score.",
    "feature_counts": featureCounts.sorted { $0.key < $1.key }.reduce(into: [[String: Any]]()) { result, item in
      result.append(["feature_id": item.key, "count": item.value])
    },
    "status_counts": statusCounts.sorted { $0.key < $1.key }.reduce(into: [[String: Any]]()) { result, item in
      result.append(["lawos_status": item.key, "count": item.value])
    },
    "rows": rows
  ]

  let data = try JSONSerialization.data(withJSONObject: inventory, options: [.prettyPrinted, .sortedKeys])
  try data.write(to: outputJSON)

  let summaryRows = (inventory["feature_counts"] as? [[String: Any]] ?? []).map { item -> String in
    "| `\(item["feature_id"] ?? "")` | \(item["count"] ?? 0) |"
  }.joined(separator: "\n")

  let tableRows = rows.map { row -> String in
    let id = row["screenshot_id"] as? Int ?? -1
    let file = row["file"] as? String ?? ""
    let primary = row["primary_feature_id"] as? String ?? ""
    let status = row["primary_lawos_status"] as? String ?? ""
    let lineCount = row["ocr_line_count"] as? Int ?? 0
    let excerpt = markdownEscape(String((row["ocr_excerpt"] as? String ?? "").prefix(140)))
    return "| \(id) | `\(file)` | `\(primary)` | `\(status)` | \(lineCount) | \(excerpt) |"
  }.joined(separator: "\n")

  let md = """
  # HRO-DEEL-PARITY Screenshot Inventory

  Generated at: \(inventory["generated_at"] ?? "")

  ## Summary

  - Source directory: `Law Firm OS UI/Deel web Jan 2026`
  - Screenshot count: \(files.count)
  - OCR engine: `apple_vision_vnrecognizetextrequest`
  - People-related keyword rows: \(peopleRelatedCount)
  - Non-People reference rows: \(files.count - peopleRelatedCount)

  ## Feature Counts

  | Primary feature | Screenshot rows |
  | --- | ---: |
  \(summaryRows)

  ## File-Level Rows

  | ID | File | Primary feature | Status | OCR lines | Excerpt |
  | ---: | --- | --- | --- | ---: | --- |
  \(tableRows)
  """

  try md.write(to: outputMD, atomically: true, encoding: .utf8)
  print("HRO screenshot inventory generated.")
  print("screenshots: \(files.count)")
  print("people_related: \(peopleRelatedCount)")
  print("json: \(outputJSON.path)")
  print("md: \(outputMD.path)")
} catch {
  die("Failed to generate HRO screenshot inventory: \(error)")
}

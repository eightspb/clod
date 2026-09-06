import Foundation
import Vision
import AppKit

/// Normalises transparent doctor portraits onto one 3:4 canvas so every face
/// renders at the same size and eye line: face width is 25 % of the canvas,
/// face top sits at 15 % of the height. Emits `{slug}-mobile.webp` (600×800)
/// and `{slug}-full.webp` (1024×1365) through cwebp. macOS only (Vision).
/// Usage: swift scripts/normalize-portraits.swift <source-dir> <output-dir>

struct Canvas { let width: Double; let height: Double; let suffix: String }
let canvases = [Canvas(width: 600, height: 800, suffix: "mobile"), Canvas(width: 1024, height: 1365, suffix: "full")]
let faceWidthRatio = 0.25
let faceTopRatio = 0.15

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

func faceBox(in image: CGImage, name: String) -> CGRect {
  let request = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  guard let faces = request.results, faces.count == 1 else { fail("Expected exactly one face in \(name), found \(request.results?.count ?? 0)") }
  return faces[0].boundingBox
}

func render(_ cg: CGImage, face: CGRect, canvas: Canvas) -> Data {
  let sourceWidth = Double(cg.width), sourceHeight = Double(cg.height)
  let scale = canvas.width * faceWidthRatio / (face.width * sourceWidth)
  let faceTop = (1 - face.maxY) * sourceHeight * scale
  let originX = canvas.width / 2 - face.midX * sourceWidth * scale
  let originY = canvas.height * faceTopRatio - faceTop
  guard let context = CGContext(data: nil, width: Int(canvas.width), height: Int(canvas.height), bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fail("Could not create canvas context") }
  context.interpolationQuality = .high
  context.draw(cg, in: CGRect(x: originX, y: canvas.height - originY - sourceHeight * scale, width: sourceWidth * scale, height: sourceHeight * scale))
  guard let rendered = context.makeImage(), let png = NSBitmapImageRep(cgImage: rendered).representation(using: .png, properties: [:]) else { fail("Could not rasterise canvas") }
  return png
}

func encodeWebp(png: Data, to output: URL) {
  let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".png")
  try! png.write(to: temporary)
  defer { try? FileManager.default.removeItem(at: temporary) }
  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
  process.arguments = ["cwebp", "-quiet", "-q", "82", "-m", "6", "-sharp_yuv", temporary.path, "-o", output.path]
  try! process.run()
  process.waitUntilExit()
  if process.terminationStatus != 0 { fail("cwebp failed for \(output.lastPathComponent) with status \(process.terminationStatus)") }
}

let arguments = CommandLine.arguments
guard arguments.count == 3 else { fail("Usage: swift scripts/normalize-portraits.swift <source-dir> <output-dir>") }
let sourceDirectory = URL(fileURLWithPath: arguments[1])
let outputDirectory = URL(fileURLWithPath: arguments[2])
let sources = (try? FileManager.default.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil))?.filter { $0.pathExtension == "png" }.sorted { $0.path < $1.path } ?? []
guard !sources.isEmpty else { fail("No PNG portraits in \(sourceDirectory.path)") }
for source in sources {
  let slug = source.deletingPathExtension().lastPathComponent.replacingOccurrences(of: "-extended", with: "")
  guard let cg = NSImage(contentsOf: source)?.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fail("Could not read \(source.path)") }
  let face = faceBox(in: cg, name: source.lastPathComponent)
  for canvas in canvases {
    let output = outputDirectory.appendingPathComponent("\(slug)-\(canvas.suffix).webp")
    encodeWebp(png: render(cg, face: face, canvas: canvas), to: output)
    print("\(output.lastPathComponent) \(Int(canvas.width))x\(Int(canvas.height)) face \(Int(face.width * Double(cg.width)))px -> \(Int(canvas.width * faceWidthRatio))px")
  }
}

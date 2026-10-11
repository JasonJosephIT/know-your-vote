// Face detector for scripts/collect-headshots.ts (compiled on first use with
// swiftc; macOS only). Uses the Vision framework, on this machine, no network.

// Prints, for each image path given, the detected face boxes as fractions of
// the image with a top-left origin: path<TAB>x y w h<TAB>... (largest first).
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path),
        let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("\(path)\tERROR"); continue
  }
  let req = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  let faces = (req.results ?? []).sorted { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }
  let cols = faces.map { f -> String in
    let b = f.boundingBox
    return String(format: "%.4f %.4f %.4f %.4f", b.minX, 1 - b.maxY, b.width, b.height)
  }
  print(([path] + cols).joined(separator: "\t"))
}

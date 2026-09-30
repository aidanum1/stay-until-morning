// Local trailer compositor (no ffmpeg needed). macOS only.
//
//   swiftc -O tools/trailer.swift -o tools/out/trailer
//   tools/out/trailer build  spec.json          -> renders spec.out
//   tools/out/trailer frames in.mp4 outdir t1 t2 ...  -> PNG stills for review
//
// spec.json:
// { "width":1080, "height":1920, "fps":30, "out":"trailer.mp4",
//   "audio":"night.m4a", "audioFadeOut":1.5,
//   "segments":[ { "dur":3.0, "panels":[ { "file":"a.mp4", "from":0.5, "rect":[0,0,1080,1920], "anchorY":0.5 } ] } ],
//   "overlays":[ { "image":"title.png", "start":0.4, "dur":2.4, "fade":0.4 } ] }
// Panels are cover-fitted into their rect (top-left origin, pixels). Overlay PNGs are full-frame.

import AVFoundation
import AppKit
import QuartzCore

struct Panel: Decodable { let file: String; let from: Double?; let rect: [Double]; let anchorY: Double? }
struct Segment: Decodable { let dur: Double; let panels: [Panel] }
struct Overlay: Decodable { let image: String; let start: Double; let dur: Double; let fade: Double? }
struct Spec: Decodable {
  let width: Int; let height: Int; let fps: Int; let out: String
  let audio: String?; let audioFadeOut: Double?
  let segments: [Segment]; let overlays: [Overlay]?
}

func fail(_ m: String) -> Never { FileHandle.standardError.write((m + "\n").data(using: .utf8)!); exit(1) }
func t(_ s: Double) -> CMTime { CMTime(seconds: s, preferredTimescale: 600) }

func build(_ specPath: String) {
  let base = URL(fileURLWithPath: specPath).deletingLastPathComponent()
  func url(_ p: String) -> URL { p.hasPrefix("/") ? URL(fileURLWithPath: p) : base.appendingPathComponent(p) }
  guard let data = FileManager.default.contents(atPath: specPath), let spec = try? JSONDecoder().decode(Spec.self, from: data)
  else { fail("cannot read spec") }

  let comp = AVMutableComposition()
  let maxPanels = spec.segments.map { $0.panels.count }.max() ?? 1
  var tracks: [AVMutableCompositionTrack] = []
  for _ in 0..<max(1, maxPanels) { tracks.append(comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!) }

  var instructions: [AVMutableVideoCompositionInstruction] = []
  var cursor = 0.0
  let W = Double(spec.width), H = Double(spec.height)
  for seg in spec.segments {
    let range = CMTimeRange(start: t(cursor), duration: t(seg.dur))
    let ins = AVMutableVideoCompositionInstruction()
    ins.timeRange = range
    ins.backgroundColor = CGColor(red: 0.02, green: 0.025, blue: 0.06, alpha: 1)
    var layers: [AVMutableVideoCompositionLayerInstruction] = []
    for (i, p) in seg.panels.enumerated() {
      let asset = AVURLAsset(url: url(p.file))
      guard let src = asset.tracks(withMediaType: .video).first else { fail("no video in \(p.file)") }
      let from = p.from ?? 0
      let avail = asset.duration.seconds - from
      if avail < seg.dur - 0.01 { fail("\(p.file) too short: need \(seg.dur) from \(from), has \(avail)") }
      do { try tracks[i].insertTimeRange(CMTimeRange(start: t(from), duration: t(seg.dur)), of: src, at: t(cursor)) } catch { fail("insert \(p.file): \(error)") }
      let sz = src.naturalSize
      let sw = Double(sz.width), sh = Double(sz.height)
      let (x, y, w, h) = (p.rect[0], p.rect[1], p.rect[2], p.rect[3])
      let s = max(w / sw, h / sh)
      let cw = w / s, ch = h / s
      let cx = (sw - cw) / 2
      let cy = (sh - ch) * (p.anchorY ?? 0.3)
      let li = AVMutableVideoCompositionLayerInstruction(assetTrack: tracks[i])
      let tf = CGAffineTransform(translationX: -cx, y: -cy)
        .concatenating(CGAffineTransform(scaleX: s, y: s))
        .concatenating(CGAffineTransform(translationX: x, y: y))
      li.setTransform(tf, at: t(cursor))
      li.setCropRectangle(CGRect(x: cx, y: cy, width: cw, height: ch), at: t(cursor))
      layers.append(li)
    }
    ins.layerInstructions = layers
    instructions.append(ins)
    cursor += seg.dur
  }
  let total = cursor

  let vc = AVMutableVideoComposition()
  vc.renderSize = CGSize(width: W, height: H)
  vc.frameDuration = CMTime(value: 1, timescale: CMTimeScale(spec.fps))
  vc.instructions = instructions

  // overlays
  let parent = CALayer(), video = CALayer()
  parent.frame = CGRect(x: 0, y: 0, width: W, height: H)
  video.frame = parent.frame
  parent.addSublayer(video)
  for o in spec.overlays ?? [] {
    guard let img = NSImage(contentsOf: url(o.image)), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fail("overlay \(o.image)") }
    let l = CALayer()
    l.frame = parent.frame
    l.contents = cg
    l.opacity = 0
    let f = o.fade ?? 0.4
    let a = CAKeyframeAnimation(keyPath: "opacity")
    a.values = [0, 1, 1, 0]
    a.keyTimes = [0, NSNumber(value: f / o.dur), NSNumber(value: 1 - f / o.dur), 1]
    a.beginTime = AVCoreAnimationBeginTimeAtZero + o.start
    a.duration = o.dur
    a.isRemovedOnCompletion = false
    a.fillMode = o.start + o.dur >= total - 0.05 ? .forwards : .removed
    if o.start + o.dur >= total - 0.05 { a.values = [0, 1, 1, 1] }
    l.add(a, forKey: "fade")
    parent.addSublayer(l)
  }
  vc.animationTool = AVVideoCompositionCoreAnimationTool(postProcessingAsVideoLayer: video, in: parent)

  // audio
  var mix: AVMutableAudioMix? = nil
  if let a = spec.audio {
    let asset = AVURLAsset(url: url(a))
    if let src = asset.tracks(withMediaType: .audio).first, let at = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
      let d = min(total, asset.duration.seconds)
      try? at.insertTimeRange(CMTimeRange(start: .zero, duration: t(d)), of: src, at: .zero)
      let p = AVMutableAudioMixInputParameters(track: at)
      let fo = spec.audioFadeOut ?? 1.5
      p.setVolumeRamp(fromStartVolume: 0, toEndVolume: 1, timeRange: CMTimeRange(start: .zero, duration: t(0.6)))
      p.setVolumeRamp(fromStartVolume: 1, toEndVolume: 0, timeRange: CMTimeRange(start: t(d - fo), duration: t(fo)))
      let m = AVMutableAudioMix(); m.inputParameters = [p]; mix = m
    }
  }

  let out = url(spec.out)
  try? FileManager.default.removeItem(at: out)
  guard let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) else { fail("no export session") }
  ex.videoComposition = vc
  ex.audioMix = mix
  ex.outputURL = out
  ex.outputFileType = .mp4
  ex.shouldOptimizeForNetworkUse = true
  let sem = DispatchSemaphore(value: 0)
  ex.exportAsynchronously { sem.signal() }
  sem.wait()
  if ex.status != .completed { fail("export failed: \(String(describing: ex.error))") }
  print("wrote \(out.path) (\(String(format: "%.1f", total)) s)")
}

func frames(_ args: [String]) {
  let asset = AVURLAsset(url: URL(fileURLWithPath: args[0]))
  let gen = AVAssetImageGenerator(asset: asset)
  gen.appliesPreferredTrackTransform = true
  gen.requestedTimeToleranceBefore = t(0.05); gen.requestedTimeToleranceAfter = t(0.05)
  let dir = URL(fileURLWithPath: args[1])
  try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
  let stem = URL(fileURLWithPath: args[0]).deletingPathExtension().lastPathComponent
  for s in args.dropFirst(2) {
    let sec = Double(s) ?? 0
    guard let cg = try? gen.copyCGImage(at: t(sec), actualTime: nil) else { print("no frame at \(s)"); continue }
    let rep = NSBitmapImageRep(cgImage: cg)
    let png = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85])!
    try? png.write(to: dir.appendingPathComponent("\(stem)_\(s).jpg"))
  }
  print("\(stem): \(String(format: "%.2f", asset.duration.seconds)) s")
}

let a = Array(CommandLine.arguments.dropFirst())
if a.count >= 2 && a[0] == "build" { build(a[1]) }
else if a.count >= 4 && a[0] == "frames" { frames(Array(a.dropFirst())) }
else { fail("usage: trailer build spec.json | trailer frames in.mp4 outdir t1 t2 ...") }

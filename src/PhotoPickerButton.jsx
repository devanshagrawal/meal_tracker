import { useRef, useState } from "react";

const C = { card: "#ffffff", border: "#e8e8e4", text: "#1c1c1c", sub: "#6b6b6b" };

function isAndroid() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
}

// On iOS, a plain file input (no `capture`) already opens a native chooser
// with Take Photo / Photo Library / Choose File, so one tap is enough.
// On Android, the same input opens straight into the system Photo Picker,
// which deliberately has no camera option — so there we show our own tiny
// menu first and route to a capture- or gallery-flavored input accordingly.
export default function PhotoPickerButton({ triggerContent, triggerStyle, disabled, onSelect, captureMode = "environment" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const captureInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  function handleChange(e) {
    const file = e.target.files[0];
    e.target.value = "";
    onSelect(file);
  }

  if (!isAndroid()) {
    return (
      <label style={triggerStyle}>
        {triggerContent}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </label>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMenuOpen((v) => !v)}
        style={{ ...triggerStyle, cursor: disabled ? "default" : "pointer" }}
      >
        {triggerContent}
      </button>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 30 }} />
          <div
            style={{
              position: "absolute", top: "100%", left: 0, marginTop: 4,
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 40, minWidth: 170, overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => { captureInputRef.current?.click(); setMenuOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.text }}
            >
              📷 Capture
            </button>
            <button
              type="button"
              onClick={() => { galleryInputRef.current?.click(); setMenuOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.text }}
            >
              🖼️ Photo Library
            </button>
          </div>
        </>
      )}

      <input ref={captureInputRef} type="file" accept="image/*" capture={captureMode} onChange={handleChange} style={{ display: "none" }} />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: "none" }} />
    </div>
  );
}

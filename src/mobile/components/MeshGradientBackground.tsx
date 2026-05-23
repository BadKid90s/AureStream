export function MeshGradientBackground() {
  return (
    <div className="mg-mesh-bg" aria-hidden="true">
      <div className="mg-mesh-layer">
        <div className="mg-mesh-gradient-1" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 30% 40%, rgba(59,130,246,0.12) 0%, transparent 55%)"
        }} />
        <div className="mg-mesh-gradient-2" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 60%, rgba(99,102,241,0.10) 0%, transparent 55%)"
        }} />
        <div className="mg-mesh-gradient-3" style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.06) 0%, transparent 50%)"
        }} />
      </div>
    </div>
  );
}

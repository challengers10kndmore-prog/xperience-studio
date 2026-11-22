import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section grid min-h-dvh place-items-center text-center">
      <div className="space-y-6">
        <p className="timecode text-ash">00:00:04:04</p>
        <h1 className="section-title">Lost in the edit.</h1>
        <Link to="/" className="btn btn-primary">Back to the reel</Link>
      </div>
    </section>
  );
}

import { useParams } from "react-router-dom";

export default function WorkPage() {
  const { discipline, category } = useParams();
  return (
    <section className="section min-h-dvh pt-32">
      <p className="eyebrow">{discipline}{category ? ` / ${category}` : ""}</p>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export type CloudFile = {
  id: string;
  name: string;
  type: "image" | "pdf" | "link";
  url: string;
  subject: string;
  description?: string;
};

/**
 * Company cloud study library.
 *
 * Point `CLOUD_CONTENT_URL` at a JSON listing hosted on your real storage
 * (S3, GCS, Drive export, CMS…) with the shape `{ files: CloudFile[] }` —
 * no code changes needed. Without it, the bundled sample library is served
 * so the feature works out of the box.
 *
 * Only files returned by this endpoint are reachable from the canvas, which
 * keeps students inside company-approved study content.
 */
const SAMPLE_LIBRARY: CloudFile[] = [
  {
    id: "algebra-formulas",
    name: "Algebra formula sheet",
    type: "image",
    url: "/cloud-content/algebra-formulas.png",
    subject: "Mathematics",
    description: "Quadratics, exponents, and logarithm rules",
  },
  {
    id: "physics-equations",
    name: "Physics equations",
    type: "image",
    url: "/cloud-content/physics-equations.png",
    subject: "Physics",
    description: "Kinematics and Newton's laws quick reference",
  },
  {
    id: "chemistry-basics",
    name: "Chemistry basics",
    type: "image",
    url: "/cloud-content/chemistry-basics.png",
    subject: "Chemistry",
    description: "Mole concept and common reaction types",
  },
];

export const Route = createFileRoute("/api/cloud")({
  server: {
    handlers: {
      GET: async () => {
        const source = process.env.CLOUD_CONTENT_URL;
        if (source) {
          try {
            const res = await fetch(source);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.files)) {
                return Response.json({ files: data.files, source: "remote" });
              }
            }
          } catch {
            /* fall through to sample library */
          }
        }
        return Response.json({ files: SAMPLE_LIBRARY, source: "sample" });
      },
    },
  },
});

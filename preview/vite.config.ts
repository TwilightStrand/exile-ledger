import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Renders extension UI on fixture data in a plain page, so UI work needs no
// trade site, no Cloudflare check and no live search.
export default defineConfig({
	root: "preview",
	plugins: [preact(), tailwindcss()],
	server: { port: 5199 },
});

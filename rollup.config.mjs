import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "dist/Marker Builder 2.jsx",
    format: "es",
    banner: "(function(thisObj){",
    footer: "})(this);",
  },
  plugins: [resolve()],
};

import { extendHex, defineGrid } from "honeycomb-grid";

import {
  useNewComponent,
  useChild,
  Canvas,
} from "@hex-engine/2d";

import Cell from "./models/Cell";

export default function Root() {
  const canvas = useNewComponent(() => Canvas({ backgroundColor: "white" }));
  canvas.fullscreen({ pixelZoom: 1 });

  // Create the grid
  const grid = defineGrid(extendHex({
    size: 50,
    orientation: 'flat',
    data: null,
  })).rectangle({ width: 10, height: 5 });

  // Create the "state"
  const state = {
    grid,
  };

  // Go!
  grid.forEach(hex => {
    hex.origin = { x: hex.x, y: hex.y };
    hex.data = new Cell(hex, state);
    useChild(() => hex.data.render());
  });
}

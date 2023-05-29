import "normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";

import { FocusStyleManager } from "@blueprintjs/core";

FocusStyleManager.onlyShowFocusOnTabs();

import { Analytics } from "@vercel/analytics/react";

import { DrawingList } from "./drawing-list";
import { UpdateManager } from "./update-manager";
import { DrawStateManager } from "./draw-state";
import { Header } from "./header";
import { ThemeSyncWidget } from "./theme-toggle";

export function App() {
  return (
    <DrawStateManager defaultDataSet="a20plus">
      <ThemeSyncWidget />
      <UpdateManager />
      <Header />
      <DrawingList />
      <Analytics />
    </DrawStateManager>
  );
}

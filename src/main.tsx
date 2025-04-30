import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import { injectThemeVariables } from "./styles/theme";

injectThemeVariables();

ReactDOM.createRoot(document.getElementById("root")!).render(
    <Provider store={store}>
      <App />
    </Provider>
);

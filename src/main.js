import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(Provider, { store: store, children: _jsx(App, {}) }));

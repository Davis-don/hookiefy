// src/components/StoriesTab.jsx

import  { useState } from "react";
import "./storiestab.css";

import AllStories from "../../../stories/components/AllStories";
import MyStories from "../../../stories/components/MyStories";

const TABS = [
  { key: "all", label: "Other Stories" },
  { key: "mine", label: "My Stories" },
];

function StoriesTab() {
  const [activeTab, setActiveTab] = useState("all");

  const renderActivePanel = () => {
    switch (activeTab) {
      case "mine":
        return <MyStories />;
      case "all":
      default:
        return <AllStories />;
    }
  };

  return (
    <div className="stories-tab">
      {/* ---------- Switcher ---------- */}
      <div className="stories-tab__switcher" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`stories-tab__btn ${
              activeTab === tab.key ? "is-active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="stories-tab__underline" />
          </button>
        ))}
      </div>

      {/* ---------- Active Panel ---------- */}
      <div className="stories-tab__content">{renderActivePanel()}</div>
    </div>
  );
}

export default StoriesTab;
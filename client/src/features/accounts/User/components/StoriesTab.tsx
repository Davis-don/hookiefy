// src/pages/accounts/User/components/StoriesTab.tsx

import { useState } from "react";
import "./storiestab.css";

import OtherStories from "../../../stories/components/OtherStories";
import MyStories from "../../../stories/components/MyStories";

const TABS = [
  { key: "all",  label: "Other Stories" },
  { key: "mine", label: "My Stories" },
];

type StoriesTabProps = {
  /** Called when the profile banner's CTA is clicked inside MyStories. */
  onGoToProfile?: () => void;
};

function StoriesTab({ onGoToProfile }: StoriesTabProps) {
  const [activeTab, setActiveTab] = useState("all");

  const renderActivePanel = () => {
    switch (activeTab) {
      case "mine":
        return <MyStories onGoToProfile={onGoToProfile} />;
      case "all":
      default:
        return <OtherStories />;
    }
  };

  return (
    <div className="stories-tab">
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

      <div className="stories-tab__content">{renderActivePanel()}</div>
    </div>
  );
}

export default StoriesTab;
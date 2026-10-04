// src/pages/accounts/User/components/StoriesTab.tsx

import { useState, useEffect, useRef } from "react";
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
  const [compact, setCompact] = useState(false);

  const switcherRef = useRef<HTMLDivElement | null>(null);

  /* ── Shrink the bar after scrolling past a small threshold ── */
  useEffect(() => {
    const SWITCHER = switcherRef.current;
    if (!SWITCHER) return;

    // Use the nearest scrollable ancestor, fallback to window
    const scrollTarget = findScrollParent(SWITCHER);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const y =
          scrollTarget instanceof Window
            ? scrollTarget.scrollY
            : scrollTarget.scrollTop;

        setCompact(y > 32);
        ticking = false;
      });
    };

    const target: HTMLElement | Window =
      scrollTarget instanceof Window ? window : scrollTarget;

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      target.removeEventListener("scroll", onScroll);
    };
  }, []);

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
      <div
        ref={switcherRef}
        className={
          "stories-tab__switcher" + (compact ? " is-compact" : "")
        }
        role="tablist"
        aria-label="Stories view"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`stories-tab__btn ${
              activeTab === tab.key ? "is-active" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="stories-tab__label">{tab.label}</span>
            <span className="stories-tab__underline" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="stories-tab__content" key={activeTab}>
        {renderActivePanel()}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Find the nearest scrollable ancestor (or window).
   Handles cases where the app uses an inner scroll container
   instead of the document body.
   ────────────────────────────────────────────────────────── */
function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;

  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScroll =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";

    if (canScroll && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }

  return window;
}

export default StoriesTab;
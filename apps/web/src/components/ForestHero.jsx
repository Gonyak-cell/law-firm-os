import React from "react";
import forestBg from "../assets/forest-bg.jpg";
import { useSkin } from "../context/SkinContext.jsx";

export function ForestHero({ title, subtitle = null, image = forestBg, imageOpacity = 0.18, children = null }) {
  const skin = useSkin();
  if (skin !== "forest") return null;

  return (
    <div className={children ? "forest-hero forest-hero-with-stats" : "forest-hero"}>
      {image && (
        <img
          className="forest-hero-image"
          src={image}
          alt=""
          aria-hidden="true"
          style={{ opacity: imageOpacity }}
        />
      )}
      <div className="forest-hero-content">
        <div className="forest-hero-copy">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children && <div className="forest-hero-stats">{children}</div>}
      </div>
    </div>
  );
}

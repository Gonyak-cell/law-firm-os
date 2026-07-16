import React from "react";
import forestBg from "../assets/forest-bg.jpg";

export function ForestHero({ title, subtitle = null, image = forestBg, imageOpacity = 0.18, actions = null, children = null }) {
  const heroClassName = [
    "forest-hero",
    children ? "forest-hero-with-stats" : "",
    actions ? "forest-hero-with-actions" : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={heroClassName}>
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
        {actions && <div className="forest-hero-actions">{actions}</div>}
      </div>
    </div>
  );
}

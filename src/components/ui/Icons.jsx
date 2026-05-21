import React from "react";

export const IconPaths = {
  // Tugu Jogja minimalis (SVG Path)
  tugu: "M12 2L9.5 5.5l1.5 1.5-1.5 2.5 1.5 1.5-1.5 2.5 1.5 1.5V22h4V16.5l1.5-1.5-1.5-2.5 1.5-1.5-1.5-2.5 1.5-1.5L12 2z",
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  barang: ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z", "M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"],
  gudang: "M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9V7a2 2 0 012-2h14a2 2 0 012 2v2",
  kategori: ["M4 6h16", "M4 12h16", "M4 18h16"],
  transaksi: ["M12 5v14", "M5 12l7-7 7 7"],
  qrcode: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h3v3h-3z", "M17 14h4", "M14 17v4", "M17 17h4v4h-4z"],
  laporan: ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8M16 17H8M10 9H8"],
  alert: ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4M12 17h.01"],
  bell: ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"],
  user: ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8"],
  box: ["M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"],
};

export const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 1.8, fill = "none" }) => {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
};

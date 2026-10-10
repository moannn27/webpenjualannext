import React from "react";

export function TokopediaLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#03AC0E" />
      {/* Tokopedia owl bag face */}
      <path
        d="M24 10C17.37 10 12 15.37 12 22C12 25.54 13.53 28.72 15.96 30.93L15.24 35.34C15.11 36.14 15.91 36.74 16.63 36.38L21.32 34.03C22.19 34.23 23.08 34.33 24 34.33C30.63 34.33 36 28.96 36 22.33C36 15.7 30.63 10 24 10Z"
        fill="white"
      />
      <circle cx="19" cy="21.5" r="3.5" fill="#03AC0E" />
      <circle cx="29" cy="21.5" r="3.5" fill="#03AC0E" />
      <circle cx="20" cy="20.5" r="1.3" fill="white" />
      <circle cx="30" cy="20.5" r="1.3" fill="white" />
      <path
        d="M24 24.5C22.9 24.5 22 25.4 22 26.5C22 27.6 22.9 28.5 24 28.5C25.1 28.5 26 27.6 26 26.5C26 25.4 25.1 24.5 24 24.5Z"
        fill="#F8A51D"
      />
    </svg>
  );
}

export function ShopeeLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#EE4D2D" />
      {/* Shopee bag handle */}
      <path
        d="M24 12C20.69 12 18 14.69 18 18V19H20V18C20 15.79 21.79 14 24 14C26.21 14 28 15.79 28 18V19H30V18C30 14.69 27.31 12 24 12Z"
        fill="white"
      />
      {/* Shopee bag body */}
      <path
        d="M14 18L16.2 34.2C16.38 35.53 17.51 36.5 18.85 36.5H29.15C30.49 36.5 31.62 35.53 31.8 34.2L34 18H14Z"
        fill="white"
      />
      {/* S letter inside */}
      <path
        d="M25.8 23.2C25.3 22.9 24.6 22.8 24 22.8C22.8 22.8 22.1 23.3 22.1 24C22.1 24.8 22.8 25.2 24.3 25.6C26.3 26.1 27.3 26.9 27.3 28.4C27.3 30.1 25.9 31.2 23.9 31.2C22.7 31.2 21.7 30.8 20.8 30.2L21.5 28.6C22.2 29.1 23 29.5 23.9 29.5C25 29.5 25.7 29 25.7 28.3C25.7 27.5 25 27.1 23.4 26.7C21.6 26.2 20.6 25.4 20.6 23.9C20.6 22.4 21.9 21.2 23.8 21.2C24.8 21.2 25.7 21.5 26.4 21.9L25.8 23.2Z"
        fill="#EE4D2D"
      />
    </svg>
  );
}

export function TikTokLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#000000" />
      {/* TikTok note mark with cyan and red 3D effect */}
      <path
        d="M31.2 18.4C29.4 18.3 27.8 17.3 27 15.8V27.5C27 31.1 24.1 34 20.5 34C16.9 34 14 31.1 14 27.5C14 23.9 16.9 21 20.5 21C21 21 21.5 21.1 22 21.2V24.5C21.5 24.3 21 24.2 20.5 24.2C18.7 24.2 17.2 25.7 17.2 27.5C17.2 29.3 18.7 30.8 20.5 30.8C22.3 30.8 23.8 29.3 23.8 27.5V12H27.2C27.5 14.5 29.5 16.5 32 16.8V20C31.7 20 31.4 18.4 31.2 18.4Z"
        fill="white"
      />
      <path
        d="M27.2 12V14.2C29.5 14.5 31.5 16.5 32 18.8V16.8C29.5 16.5 27.5 14.5 27.2 12Z"
        fill="#25F4EE"
      />
      <path
        d="M23.8 27.5C23.8 29.3 22.3 30.8 20.5 30.8C18.7 30.8 17.2 29.3 17.2 27.5C17.2 26.8 17.4 26.1 17.8 25.5C17.4 26.1 17.2 26.8 17.2 27.5C17.2 29.3 18.7 30.8 20.5 30.8C22.3 30.8 23.8 29.3 23.8 27.5V26.5H23.8V27.5Z"
        fill="#FE2C55"
      />
    </svg>
  );
}

export function InstagramLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFDC80" />
          <stop offset="0.25" stopColor="#FCAF45" />
          <stop offset="0.5" stopColor="#F77737" />
          <stop offset="0.75" stopColor="#F56040" />
          <stop offset="0.9" stopColor="#FD1D1D" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-grad)" />
      {/* Outer camera outline */}
      <rect x="13" y="13" width="22" height="22" rx="6" stroke="white" strokeWidth="2.5" />
      {/* Lens */}
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2.5" />
      {/* Flash dot */}
      <circle cx="29.5" cy="18.5" r="1.3" fill="white" />
    </svg>
  );
}

export function WhatsAppLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#25D366" />
      <path
        d="M24 11C16.82 11 11 16.82 11 24C11 26.54 11.73 28.92 13 30.93L11.5 36.5L17.25 35.03C19.21 36.22 21.52 37 24 37C31.18 37 37 31.18 37 24C37 16.82 31.18 11 24 11ZM30.55 28.46C30.17 29.53 28.66 30.43 27.63 30.63C26.93 30.77 26.02 30.87 22.95 29.6C19.03 27.97 16.5 23.98 16.31 23.72C16.12 23.46 14.75 21.64 14.75 19.76C14.75 17.88 15.7 16.96 16.08 16.57C16.4 16.24 16.92 16.09 17.43 16.09C17.59 16.09 17.74 16.1 17.87 16.11C18.25 16.13 18.44 16.15 18.69 16.75C19 17.5 19.76 19.35 19.85 19.54C19.95 19.73 20.04 19.98 19.92 20.23C19.8 20.48 19.7 20.6 19.51 20.82C19.32 21.04 19.14 21.2 18.95 21.43C18.78 21.62 18.59 21.83 18.8 22.2C19.01 22.56 19.94 24.08 21.32 25.31C23.09 26.89 24.54 27.39 24.95 27.56C25.36 27.73 25.6 27.69 25.85 27.41C26.1 27.12 26.92 26.16 27.21 25.75C27.5 25.34 27.79 25.39 28.17 25.53C28.55 25.67 30.58 26.68 31 26.89C31.42 27.1 31.7 27.2 31.8 27.37C31.9 27.54 31.9 28.39 30.55 28.46Z"
        fill="white"
      />
    </svg>
  );
}

export function LazadaLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0F146D" />
      <path
        d="M24 13L33 22L24 31L15 22L24 13Z"
        fill="#F36F21"
      />
      <circle cx="24" cy="22" r="4" fill="white" />
    </svg>
  );
}

export function BlibliLogo({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0095DA" />
      <circle cx="24" cy="20" r="7" fill="white" />
      <circle cx="24" cy="20" r="3.5" fill="#0095DA" />
      <rect x="19" y="27" width="10" height="5" rx="2.5" fill="#F8B122" />
    </svg>
  );
}

export function PlatformLogo({
  platform,
  customIconUrl,
  className = "size-6",
}: {
  platform: string;
  customIconUrl?: string;
  className?: string;
}) {
  if (customIconUrl && customIconUrl.trim()) {
    return (
      <img
        src={customIconUrl}
        alt={platform}
        className={`${className} object-contain rounded-xl shadow-xs`}
        onError={(e) => {
          // If custom image fails to load, hide or fallback
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }

  switch (platform.toLowerCase()) {
    case "tokopedia":
      return <TokopediaLogo className={className} />;
    case "shopee":
      return <ShopeeLogo className={className} />;
    case "tiktok":
    case "tiktok_shop":
    case "tiktokshop":
      return <TikTokLogo className={className} />;
    case "instagram":
      return <InstagramLogo className={className} />;
    case "whatsapp":
    case "wa":
      return <WhatsAppLogo className={className} />;
    case "lazada":
      return <LazadaLogo className={className} />;
    case "blibli":
      return <BlibliLogo className={className} />;
    default:
      return (
        <div className={`grid place-items-center rounded-xl bg-primary/10 text-primary font-bold ${className}`}>
          {platform.slice(0, 2).toUpperCase()}
        </div>
      );
  }
}

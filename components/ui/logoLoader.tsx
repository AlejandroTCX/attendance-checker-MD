"use client";

import React from "react";

export default function LogoLoader({
  label = "Cargando...",
}: {
  label?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        {/* Glow Circle Background */}
        <div
          style={{
            position: "absolute",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(220, 38, 38, 0.3), transparent 70%)",
            animation: "pulse 2s ease-in-out infinite",
            filter: "blur(40px)",
          }}
        />

        {/* Logo Container */}
        <div
          style={{
            position: "relative",
            width: "180px",
            height: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "vibrate 0.8s ease-in-out infinite",
          }}
        >
          {/* Rotating Ring */}
          <div
            style={{
              position: "absolute",
              width: "200px",
              height: "200px",
              border: "3px solid transparent",
              borderTopColor: "#dc2626",
              borderRightColor: "#ef4444",
              borderRadius: "50%",
              animation: "rotate 2s linear infinite",
            }}
          />

          {/* Logo Image */}
          <img
            src="/Logo Mariana Nuevo .png"
            alt="Logo"
            style={{
              width: "160px",
              height: "160px",
              objectFit: "contain",
              filter: "drop-shadow(0 0 30px rgba(220, 38, 38, 0.6))",
              animation: "logoGlow 2s ease-in-out infinite",
              zIndex: 2,
            }}
          />

          {/* Particles around logo */}
          {[...Array(8)].map((_, i) => (
            <div
              key={`particle-${i}`}
              style={{
                position: "absolute",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: i % 2 === 0 ? "#dc2626" : "#ffffff",
                animation: `orbit 3s linear infinite`,
                animationDelay: `${i * 0.375}s`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Loading Dots */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#dc2626",
                animation: `dotPulse 1.8s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
                boxShadow: "0 0 20px rgba(220, 38, 38, 0.5)",
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: "250px",
            height: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #dc2626, #ef4444, #ffffff)",
              animation: "progress 2s ease-in-out infinite",
              borderRadius: "10px",
              boxShadow: "0 0 15px rgba(220, 38, 38, 0.8)",
            }}
          />
        </div>

        {/* Loading Text */}
        <p
          style={{
            color: "#ffffff",
            fontSize: "18px",
            fontWeight: "600",
            letterSpacing: "0.1em",
            animation: "fadeInOut 2s ease-in-out infinite",
            textTransform: "uppercase",
            textShadow: "0 0 10px rgba(220, 38, 38, 0.5)",
          }}
        >
          {label}
        </p>
      </div>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.5;
          }
          50% { 
            transform: scale(1.3);
            opacity: 0.8;
          }
        }

        @keyframes vibrate {
          0%, 100% { 
            transform: translate(0, 0) rotate(0deg);
          }
          10% { 
            transform: translate(-2px, -2px) rotate(-1deg);
          }
          20% { 
            transform: translate(2px, 2px) rotate(1deg);
          }
          30% { 
            transform: translate(-2px, 2px) rotate(-1deg);
          }
          40% { 
            transform: translate(2px, -2px) rotate(1deg);
          }
          50% { 
            transform: translate(-1px, 1px) rotate(-0.5deg);
          }
          60% { 
            transform: translate(1px, -1px) rotate(0.5deg);
          }
          70% { 
            transform: translate(-1px, -1px) rotate(-0.5deg);
          }
          80% { 
            transform: translate(1px, 1px) rotate(0.5deg);
          }
          90% { 
            transform: translate(-1px, 1px) rotate(-0.5deg);
          }
        }

        @keyframes logoGlow {
          0%, 100% { 
            filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.4));
          }
          50% { 
            filter: drop-shadow(0 0 40px rgba(220, 38, 38, 0.8));
          }
        }

        @keyframes dotPulse {
          0%, 100% { 
            transform: scale(0.8);
            opacity: 0.3;
            boxShadow: 0 0 10px rgba(220, 38, 38, 0.3);
          }
          50% { 
            transform: scale(1.3);
            opacity: 1;
            boxShadow: 0 0 30px rgba(220, 38, 38, 1);
          }
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(100px) scale(0);
            opacity: 0;
          }
          25% {
            opacity: 1;
            transform: rotate(90deg) translateX(100px) scale(1);
          }
          50% {
            opacity: 1;
            transform: rotate(180deg) translateX(100px) scale(1);
          }
          75% {
            opacity: 1;
            transform: rotate(270deg) translateX(100px) scale(1);
          }
          100% {
            transform: rotate(360deg) translateX(100px) scale(0);
            opacity: 0;
          }
        }

        @keyframes fadeInOut {
          0%, 100% { 
            opacity: 0.6;
            transform: translateY(0);
          }
          50% { 
            opacity: 1;
            transform: translateY(-5px);
          }
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

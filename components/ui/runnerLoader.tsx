"use client";

import React from "react";

export default function OmegaLoader({
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
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
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
        {/* Contenedor del Omega */}
        <div
          style={{
            position: "relative",
            width: "120px",
            height: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Círculo de fondo pulsante */}
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(147, 51, 234, 0.3), transparent 70%)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />

          {/* Anillo rotatorio */}
          <div
            style={{
              position: "absolute",
              width: "110px",
              height: "110px",
              border: "2px solid transparent",
              borderTopColor: "#a855f7",
              borderRightColor: "#ec4899",
              borderRadius: "50%",
              animation: "rotate 1.5s linear infinite",
            }}
          />

          {/* Símbolo Omega */}
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #a855f7, #ec4899, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))",
              animation: "glow 2s ease-in-out infinite",
              zIndex: 2,
            }}
          >
            Ω
          </div>

          {/* Destellos */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: "4px",
                height: "20px",
                background: "linear-gradient(180deg, #fff, transparent)",
                transform: `rotate(${angle}deg) translateY(-50px)`,
                transformOrigin: "center",
                animation: `sparkle 2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
                opacity: 0,
              }}
            />
          ))}

          {/* Partículas flotantes */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`particle-${i}`}
              style={{
                position: "absolute",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: i % 2 === 0 ? "#a855f7" : "#ec4899",
                animation: `float 3s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                opacity: 0,
              }}
            />
          ))}
        </div>

        {/* Texto */}
        <p
          style={{
            color: "#fff",
            fontSize: "18px",
            fontWeight: "500",
            letterSpacing: "0.05em",
            animation: "fadeInOut 2s ease-in-out infinite",
          }}
        >
          {label}
        </p>

        {/* Barra de progreso animada */}
        <div
          style={{
            width: "200px",
            height: "3px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #a855f7, #ec4899, #f97316)",
              animation: "progress 2s ease-in-out infinite",
              borderRadius: "10px",
            }}
          />
        </div>
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
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes glow {
          0%, 100% { 
            filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.8));
          }
          50% { 
            filter: drop-shadow(0 0 40px rgba(236, 72, 153, 1));
          }
        }

        @keyframes sparkle {
          0%, 100% { 
            opacity: 0;
            transform: rotate(var(--angle, 0deg)) translateY(-50px) scale(0);
          }
          50% { 
            opacity: 1;
            transform: rotate(var(--angle, 0deg)) translateY(-70px) scale(1);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          50% {
            transform: translate(30px, -40px);
            opacity: 0.5;
          }
          75% {
            opacity: 1;
          }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
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

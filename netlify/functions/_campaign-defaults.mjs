export const campaignDefaults = {
  version: 2,
  markets: [
    {
      id: "cowichan-valley",
      name: "Cowichan Valley",
      countries: ["CA"],
      provinces: ["BC"],
      cities: ["Duncan", "Cobble Hill", "Mill Bay", "Lake Cowichan", "Shawnigan Lake"],
      postalPrefixes: ["V0R", "V9L"]
    },
    {
      id: "vancouver-island",
      name: "Vancouver Island",
      countries: ["CA"],
      provinces: ["BC"],
      cities: [],
      postalPrefixes: ["V0N", "V0P", "V0R", "V8A", "V8B", "V8C", "V8G", "V8H", "V8J", "V8K", "V8L", "V8M", "V8N", "V8P", "V8R", "V8S", "V8T", "V8V", "V8W", "V8X", "V8Y", "V8Z", "V9A", "V9B", "V9C", "V9E", "V9G", "V9H", "V9J", "V9K", "V9L", "V9M", "V9N", "V9P", "V9R", "V9S", "V9T", "V9V", "V9W", "V9X", "V9Y", "V9Z"]
    }
  ],
  overlays: [
    {
      id: "sunfest-2026",
      name: "Sunfest 2026",
      mode: "off",
      priority: 100,
      startAt: "2026-07-25T12:00:00-07:00",
      endAt: "2026-08-03T00:00:00-07:00",
      linkUrl: "https://sunfestconcerts.com/",
      targeting: {
        mode: "everyone",
        marketIds: [],
        countries: [],
        provinces: [],
        cities: [],
        postalPrefixes: []
      },
      assets: {
        partnerLogo: "/assets/images/sunfest-country-music-festival-logo.png",
        heroDesktop: "/assets/images/sunfest-hero-desktop-graphic.png",
        heroMobile: "/assets/images/sunfest-hero-mobile-graphic.png"
      },
      theme: {
        barBackground: "#D9A238",
        barText: "#111111",
        primaryButton: "#111111",
        primaryButtonText: "#F7F1E6"
      },
      en: {
        announcement: "Sueños is proud to partner with Sunfest 2026 · July 30–August 2",
        eyebrow: "PROUD PARTNER OF SUNFEST 2026",
        headline: "Paradise Looks Good in a Cowboy Hat",
        body: "Sueños is proud to partner with Sunfest for a weekend of country music, good people and premium tequila.",
        primaryLabel: "Find Us at Sunfest",
        secondaryLabel: "Explore Cocktails"
      },
      es: {
        announcement: "Sueños se enorgullece de colaborar con Sunfest 2026 · 30 de julio–2 de agosto",
        eyebrow: "SOCIO ORGULLOSO DE SUNFEST 2026",
        headline: "El paraíso se ve bien con sombrero vaquero",
        body: "Sueños se enorgullece de colaborar con Sunfest durante un fin de semana de música country, buena compañía y tequila premium.",
        primaryLabel: "Encuéntranos en Sunfest",
        secondaryLabel: "Explorar cócteles"
      }
    }
  ]
};

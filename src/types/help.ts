/** Sekcja instrukcji obsługi — wspólny kształt dla worker / admin / platform. */
export type HelpSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type HelpGlossary = {
  title: string;
  terms: { term: string; definition: string }[];
};

export type HelpEmergency = {
  title: string;
  body: string;
};

export type HelpContactBlock = {
  quickContact: string;
  contactDesc: string;
  callDispatcher: string;
};

export type HelpPageContent = {
  title: string;
  backLabel: string;
  intro?: string;
  userManual?: string;
  sections: HelpSection[];
  glossary?: HelpGlossary;
  contact?: HelpContactBlock;
  emergency?: HelpEmergency;
};

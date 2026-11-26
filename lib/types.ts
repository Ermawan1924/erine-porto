export type Project = { id: string; title: string; category: string; year: string; description: string; cover: string; images: string[] };
export type Content = {
  profile: { name: string; role: string; tagline: string; intro: string; email: string; phone: string; instagram: string; linkedin: string; behance: string; photo: string };
  experience: { period: string; role: string; company: string }[];
  achievements: { level: string; title: string; org: string }[];
  categories: string[];
  projects: Project[];
};

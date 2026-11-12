const JOBS = [
  {id:1,title:'Desarrollador Frontend Junior',company:'Microsoft',location:'Bogotá',modality:'Híbrido',type:'Primer empleo',area:'Software',posted:1,logo:'M',tone:'tech',description:'Participa en el desarrollo de experiencias web accesibles, rápidas y centradas en el usuario.',requirements:['Conocimientos de HTML, CSS y JavaScript','Familiaridad con Git y diseño responsive','Interés por aprender y trabajar en equipo']},
  {id:2,title:'Analista de Datos Junior',company:'Alcon',location:'Bogotá',modality:'Híbrido',type:'Tiempo completo',area:'Datos',posted:2,logo:'A',tone:'health',description:'Apoya la transformación de datos en información clara para la toma de decisiones del negocio.',requirements:['Excel intermedio o avanzado','Bases de SQL y visualización de datos','Pensamiento analítico y comunicación clara']},
  {id:3,title:'Practicante de Marketing Digital',company:'Mercado Libre',location:'Colombia',modality:'Remoto',type:'Prácticas',area:'Marketing',posted:3,logo:'ML',tone:'creative',description:'Acompaña campañas digitales y analiza resultados para mejorar la experiencia de los usuarios.',requirements:['Estudiante de últimos semestres','Interés en marketing y comercio electrónico','Buena redacción y manejo de métricas']},
  {id:4,title:'Diseñador UX/UI Junior',company:'Nubank',location:'Bogotá',modality:'Híbrido',type:'Primer empleo',area:'Diseño',posted:4,logo:'N',tone:'finance',description:'Diseña interfaces simples y consistentes para productos digitales de alto impacto.',requirements:['Portafolio de diseño digital','Conocimientos de Figma','Bases de investigación y prototipado']},
  {id:5,title:'Auxiliar Administrativo',company:'Bancolombia',location:'Medellín',modality:'Presencial',type:'Tiempo completo',area:'Administración',posted:5,logo:'B',tone:'finance',description:'Brinda soporte a procesos administrativos, gestión documental y atención de solicitudes internas.',requirements:['Formación técnica, tecnológica o profesional','Manejo de herramientas ofimáticas','Organización y orientación al servicio']},
  {id:6,title:'Ingeniero de Soporte Junior',company:'Globant',location:'Cali',modality:'Remoto',type:'Primer empleo',area:'Software',posted:6,logo:'G',tone:'tech',description:'Resuelve solicitudes técnicas y acompaña a usuarios en el uso de soluciones empresariales.',requirements:['Conocimientos de Windows y redes','Inglés básico o intermedio','Actitud de servicio y diagnóstico']},
  {id:7,title:'Practicante de Recursos Humanos',company:'Rappi',location:'Bogotá',modality:'Híbrido',type:'Prácticas',area:'Talento',posted:7,logo:'R',tone:'retail',description:'Apoya iniciativas de selección, experiencia del colaborador y comunicación interna.',requirements:['Estudiante de Psicología o Administración','Interés por gestión humana','Comunicación y organización']},
  {id:8,title:'Analista Financiero Junior',company:'Deloitte',location:'Bogotá',modality:'Híbrido',type:'Primer empleo',area:'Finanzas',posted:8,logo:'D',tone:'finance',description:'Apoya análisis financieros, elaboración de reportes y seguimiento de indicadores.',requirements:['Formación en Finanzas, Economía o Contaduría','Excel intermedio','Atención al detalle']},
  {id:9,title:'Asistente de Operaciones',company:'Amazon',location:'Bogotá',modality:'Presencial',type:'Tiempo completo',area:'Operaciones',posted:9,logo:'A',tone:'creative',description:'Coordina actividades operativas y apoya el seguimiento de indicadores de calidad y servicio.',requirements:['Capacidad de organización','Manejo de Excel','Disponibilidad para trabajo presencial']},
  {id:10,title:'Practicante de Diseño Gráfico',company:'Publicis Groupe',location:'Medellín',modality:'Remoto',type:'Prácticas',area:'Diseño',posted:10,logo:'P',tone:'creative',description:'Crea piezas visuales para campañas digitales y adapta contenidos a distintos formatos.',requirements:['Estudiante de Diseño Gráfico','Manejo de herramientas de diseño','Portafolio académico']},
  {id:11,title:'Desarrollador Backend Junior',company:'Endava',location:'Colombia',modality:'Remoto',type:'Primer empleo',area:'Software',posted:11,logo:'E',tone:'tech',description:'Construye y mantiene servicios backend con acompañamiento de un equipo de ingeniería.',requirements:['Fundamentos de programación orientada a objetos','Bases de datos relacionales','Git y consumo de API REST']},
  {id:12,title:'Ejecutivo de Servicio Junior',company:'SURA',location:'Barranquilla',modality:'Presencial',type:'Tiempo completo',area:'Servicio',posted:12,logo:'S',tone:'health',description:'Acompaña a clientes, gestiona solicitudes y ofrece una experiencia de servicio cercana y clara.',requirements:['Comunicación efectiva','Orientación al cliente','Manejo básico de herramientas digitales']}
];

const STORAGE_KEY = 'hireUSavedJobs';

export class JobModel {
  constructor(jobs = JOBS, storage = null) {
    this.jobs = jobs;
    this.storage = storage;
    if (!this.storage) {
      try {
        this.storage = window.localStorage;
      } catch {
        this.storage = null;
      }
    }
    this.savedJobs = this.loadSavedJobs();
  }

  getJobs(filters = {}) {
    const query = (filters.keyword || '').trim().toLowerCase();
    const modalities = filters.modalities || [];
    const types = filters.types || [];
    const filtered = this.jobs.filter(job => {
      const searchableText = `${job.title} ${job.company} ${job.area}`.toLowerCase();
      return (!query || searchableText.includes(query))
        && (!filters.location || job.location === filters.location)
        && (!modalities.length || modalities.includes(job.modality))
        && (!types.length || types.includes(job.type));
    });

    if (filters.sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    if (filters.sort === 'company') filtered.sort((a, b) => a.company.localeCompare(b.company));
    if (!filters.sort || filters.sort === 'recent') filtered.sort((a, b) => a.posted - b.posted);
    return filtered;
  }

  getJob(id) {
    return this.jobs.find(job => job.id === id);
  }

  getLocations() {
    return [...new Set(this.jobs.map(job => job.location))];
  }

  getSavedJobs() {
    return new Set(this.savedJobs);
  }

  isSaved(id) {
    return this.savedJobs.has(id);
  }

  toggleSaved(id) {
    if (!this.getJob(id)) return false;
    if (this.savedJobs.has(id)) {
      this.savedJobs.delete(id);
    } else {
      this.savedJobs.add(id);
    }

    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify([...this.savedJobs]));
    } catch {
      // Saving remains available for the current page session when storage is blocked.
    }
    return this.savedJobs.has(id);
  }

  loadSavedJobs() {
    const validIds = new Set(this.jobs.map(job => job.id));
    try {
      const stored = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(stored)
        ? stored.map(Number).filter(id => validIds.has(id))
        : []);
    } catch {
      return new Set();
    }
  }
}
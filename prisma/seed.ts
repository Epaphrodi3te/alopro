import bcrypt from "bcrypt";
import { Department, PrismaClient, Role, ProjectStatus, TaskStatus, TaskPriority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@alopro.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "Admin";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Principal";
  const phone = process.env.SEED_ADMIN_PHONE ?? "+22990000000";
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      phone,
      role: Role.admin,
      department: Department.software_development,
      password: hashedPassword,
    },
    create: {
      firstName,
      lastName,
      email,
      phone,
      role: Role.admin,
      department: Department.software_development,
      password: hashedPassword,
    },
  });

  // Create test managers
  const managers = [];
  for (let i = 1; i <= 3; i++) {
    const managerEmail = `manager${i}@alopro.com`;
    const manager = await prisma.user.upsert({
      where: { email: managerEmail },
      update: {},
      create: {
        firstName: `Manager`,
        lastName: `User${i}`,
        email: managerEmail,
        phone: `+2299000000${i}`,
        role: Role.manager,
        department: [Department.software_development, Department.research_innovation, Department.training][i % 3],
        password: hashedPassword,
      },
    });
    managers.push(manager);
  }

  // Create test agents
  const agents = [];
  for (let i = 1; i <= 5; i++) {
    const agentEmail = `agent${i}@alopro.com`;
    const agent = await prisma.user.upsert({
      where: { email: agentEmail },
      update: {},
      create: {
        firstName: `Agent`,
        lastName: `User${i}`,
        email: agentEmail,
        phone: `+2299100000${i}`,
        role: Role.agent,
        department: [Department.software_development, Department.research_innovation, Department.training][(i - 1) % 3],
        password: hashedPassword,
      },
    });
    agents.push(agent);
  }

  // Create test projects
  const projectTitles = [
    "Développement API REST",
    "Refactorisation de la base de données",
    "Migration cloud AWS",
    "Implémentation du SSO",
    "Optimisation des performances",
    "Création du dashboard analytics",
    "Système de notifications real-time",
    "Documentation technique",
  ];

  const projectDescriptions = [
    "Créer une API REST complète pour la gestion des utilisateurs",
    "Refactoriser la base de données pour améliorer les performances",
    "Migrer l'infrastructure vers AWS avec haute disponibilité",
    "Implémenter Single Sign-On pour la sécurité",
    "Optimiser les requêtes et réduire les temps de réponse",
    "Créer un dashboard d'analyse des données",
    "Mettre en place un système de notifications en temps réel",
    "Documenter l'architecture et les APIs",
  ];

  const projects = [];
  for (let i = 0; i < projectTitles.length; i++) {
    const project = await prisma.project.create({
      data: {
        title: projectTitles[i],
        description: projectDescriptions[i],
        createdById: admin.id,
        assignedToId: managers[i % managers.length].id,
        status: [ProjectStatus.pending, ProjectStatus.in_progress, ProjectStatus.completed][i % 3],
        commissionCfa: 5000 + i * 1000,
        deadline: new Date(Date.now() + (30 + i * 10) * 24 * 60 * 60 * 1000),
        progressPercent: i % 3 === 2 ? 100 : i % 3 === 1 ? 50 : 0,
        reportRequired: i % 2 === 0,
      },
    });
    projects.push(project);
  }

  // Create test tasks
  const taskTitles = [
    "Concevoir le schéma de base de données",
    "Implémenter l'authentification",
    "Tester les endpoints",
    "Créer la documentation",
    "Optimiser les requêtes SQL",
    "Configurer le CI/CD",
    "Implémenter le caching",
    "Écrire les tests unitaires",
    "Configurer le logging",
    "Mettre en place le monitoring",
  ];

  const taskDescriptions = [
    "Créer un schéma de base de données robuste et normalisé",
    "Ajouter l'authentification avec JWT et refresh tokens",
    "Écrire et exécuter les tests pour tous les endpoints",
    "Générer la documentation API avec Swagger",
    "Analyser et optimiser les requêtes lentes",
    "Configurer GitHub Actions pour l'intégration continue",
    "Implémenter Redis pour le caching des données",
    "Augmenter la couverture de tests à 80%",
    "Configurer le logging centralisé",
    "Mettre en place Prometheus et Grafana",
  ];

  for (let i = 0; i < taskTitles.length; i++) {
    const task = await prisma.task.create({
      data: {
        title: taskTitles[i],
        description: taskDescriptions[i],
        projectId: projects[i % projects.length].id,
        createdById: managers[i % managers.length].id,
        assignedToId: agents[i % agents.length].id,
        priority: [TaskPriority.low, TaskPriority.medium, TaskPriority.high][i % 3],
        status: [TaskStatus.todo, TaskStatus.in_progress, TaskStatus.done][i % 3],
        deadline: new Date(Date.now() + (7 + i * 3) * 24 * 60 * 60 * 1000),
        commissionCfa: 1000 + i * 200,
        progressPercent: i % 3 === 2 ? 100 : i % 3 === 1 ? 60 : 20,
        reportRequired: i % 2 === 0,
      },
    });
  }

  // Create test messages
  const messageContents = [
    "Bonjour, comment avance le projet?",
    "J'ai besoin de plus de détails sur les exigences",
    "Le code est prêt pour révision",
    "Pouvez-vous vérifier mon dernier commit?",
    "La deadline a été repoussée de 2 jours",
    "Excellent travail sur l'implémentation!",
    "Nous avons rencontré un bug en production",
    "Pouvons-nous planifier une réunion demain?",
    "Les tests sont tous passés avec succès",
    "J'ai besoin de votre avis sur cette approche",
  ];

  for (let i = 0; i < messageContents.length; i++) {
    await prisma.message.create({
      data: {
        content: messageContents[i],
        senderId: i % 2 === 0 ? managers[i % managers.length].id : agents[i % agents.length].id,
        receiverId: i % 2 === 0 ? agents[i % agents.length].id : managers[i % managers.length].id,
      },
    });
  }

  console.log("✅ Seed terminé avec succès!");
  console.log(`📧 Compte admin: ${email}`);
  console.log(`👥 ${managers.length} managers créés`);
  console.log(`👥 ${agents.length} agents créés`);
  console.log(`📋 ${projects.length} projets créés`);
  console.log(`✓ 10 tâches créées`);
  console.log(`💬 10 messages créés`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

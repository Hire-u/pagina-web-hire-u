import { pool } from '../config/database.js';

const profileColumns = `
  E.EgresadoId AS id,
  E.Nombre AS firstName,
  E.Apellido AS lastName,
  E.CorreoInstitucional AS email,
  E.ProgramaAcademico AS career,
  E.AnioGraduacion AS graduationYear,
  E.PerfilProfesional AS professionalProfile,
  (SELECT S.Institucion FROM Estudios S WHERE S.EgresadoId = E.EgresadoId ORDER BY S.EstudioId LIMIT 1) AS institution,
  (SELECT S.NivelAcademico FROM Estudios S WHERE S.EgresadoId = E.EgresadoId ORDER BY S.EstudioId LIMIT 1) AS academicLevel`;

export const EgresadoModel = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT ${profileColumns}, E.ContrasenaHash AS passwordHash
       FROM Egresado E WHERE LOWER(E.CorreoInstitucional) = ?`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${profileColumns} FROM Egresado E WHERE E.EgresadoId = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create(profile) {
    const connection = await pool.getConnection();
    let egresadoId;
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO Egresado
          (Nombre, Apellido, CorreoInstitucional, ContrasenaHash, ProgramaAcademico, AnioGraduacion, PerfilProfesional)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.firstName,
          profile.lastName,
          profile.email,
          profile.passwordHash,
          profile.career || null,
          profile.graduationYear,
          profile.professionalProfile || null
        ]
      );
      egresadoId = result.insertId;

      if (profile.institution || profile.academicLevel || profile.career) {
        await connection.execute(
          `INSERT INTO Estudios (EgresadoId, NivelAcademico, Institucion, Programa)
           VALUES (?, ?, ?, ?)`,
          [egresadoId, profile.academicLevel || null, profile.institution || null, profile.career || null]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.findById(egresadoId);
  }
};
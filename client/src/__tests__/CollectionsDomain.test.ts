import { describe, expect, it } from 'vitest';
import {
  MOCK_COLLECTIONS,
  MOCK_COLLECTION_COURSES,
} from '@/modules/library/infrastructure/mock-collections';
import {
  countCourseDocuments,
  countCourseLessons,
  collectionProgress,
  collectionTotalDuration,
  courseModules,
  courseProgress,
  courseTotalDuration,
} from '@/core/domain/collection';

const allModules = MOCK_COLLECTION_COURSES.flatMap((course) => courseModules(course));
const allSections = MOCK_COLLECTION_COURSES.flatMap((course) => course.sections ?? []);
const allLessons = allModules.flatMap((module) => module.lessons);
const allDocuments = allModules.flatMap((module) => module.documents ?? []);

describe('fixtures de coleções', () => {
  it('expõe coleções com cursos e facets de categoria/plataforma', () => {
    expect(MOCK_COLLECTIONS).toHaveLength(4);
    expect(MOCK_COLLECTION_COURSES).toHaveLength(7);

    const providers = MOCK_COLLECTION_COURSES.map((course) => course.provider);
    expect(new Set(providers)).toEqual(new Set(['Udemy', 'Alura', 'Domestika', 'Hotmart']));
    for (const course of MOCK_COLLECTION_COURSES) {
      expect(course.category).toBeTruthy();
      expect(course.tags).toContain(course.category);
      expect(course.tags).toContain(course.provider);
    }
  });

  it('cobre coleções com um e com vários cursos', () => {
    const sizes = MOCK_COLLECTIONS.map((collection) => collection.courses.length);
    expect(sizes).toContain(1);
    expect(sizes.some((size) => size > 1)).toBe(true);
  });

  it('cobre cursos com e sem seções', () => {
    const withSections = MOCK_COLLECTION_COURSES.filter((course) => course.sections);
    const withoutSections = MOCK_COLLECTION_COURSES.filter((course) => !course.sections);
    expect(withSections.length).toBeGreaterThan(0);
    expect(withoutSections.length).toBeGreaterThan(0);
  });

  it('liga cada curso à sua coleção', () => {
    for (const collection of MOCK_COLLECTIONS) {
      expect(collection.courses.length).toBeGreaterThan(0);
      for (const course of collection.courses) {
        expect(course.collectionId).toBe(collection.id);
      }
    }
  });

  it('mantém `modules` como projeção fiel das seções quando elas existem', () => {
    for (const course of MOCK_COLLECTION_COURSES) {
      if (course.sections) {
        const projected = course.sections.flatMap((section) => section.modules);
        expect(course.modules).toEqual(projected);
      } else {
        expect(course.modules.length).toBeGreaterThan(0);
      }
      expect(courseModules(course)).toEqual(course.modules);
    }
  });

  it('atribui cada aula e módulo aos seus pais', () => {
    for (const course of MOCK_COLLECTION_COURSES) {
      for (const section of course.sections ?? []) {
        expect(section.courseId).toBe(course.id);
        for (const module of section.modules) {
          expect(module.courseId).toBe(course.id);
          expect(module.sectionId).toBe(section.id);
          module.lessons.forEach((lesson, index) => {
            expect(lesson.moduleId).toBe(module.id);
            expect(lesson.order).toBe(index + 1);
          });
        }
      }
    }
  });

  it('não repete ids em nenhum nível', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(MOCK_COLLECTION_COURSES.map((course) => course.id))).toBe(true);
    expect(unique(allSections.map((section) => section.id))).toBe(true);
    expect(unique(allModules.map((module) => module.id))).toBe(true);
    expect(unique(allLessons.map((lesson) => lesson.id))).toBe(true);
    expect(unique(allDocuments.map((document) => document.id))).toBe(true);
  });

  it('deduplica codificações: títulos limpos e únicos por módulo', () => {
    for (const module of allModules) {
      const titles = module.lessons.map((lesson) => lesson.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const title of titles) {
        expect(title).not.toMatch(/\(cópia\)/i);
        expect(title).not.toMatch(/\b\d{3,4}p\b/i);
      }
    }
  });

  it('aponta toda mídia para os assets locais', () => {
    for (const lesson of allLessons) {
      expect(lesson.videoUrl).toMatch(/^\/media\/videos\/.+\.mp4$/);
      expect(lesson.duration).toBeGreaterThan(0);
    }
    for (const material of allLessons.flatMap((lesson) => lesson.materials)) {
      expect(material.url).toMatch(/^\/media\/docs\/.+\.pdf$/);
    }
    for (const document of allDocuments) {
      expect(document.fileUrl).toMatch(/^\/media\/docs\/.+\.pdf$/);
    }
  });

  it('calcula duração, contagem e progresso coerentes', () => {
    for (const course of MOCK_COLLECTION_COURSES) {
      const lessons = courseModules(course).flatMap((module) => module.lessons);
      const expectedDuration = lessons.reduce((sum, lesson) => sum + lesson.duration, 0);
      expect(course.totalDuration).toBe(expectedDuration);
      expect(course.totalDuration).toBe(courseTotalDuration(course));
      expect(course.pdfCount).toBe(countCourseDocuments(course));
      expect(countCourseLessons(course)).toBe(lessons.length);
      const completed = lessons.filter((lesson) => lesson.completed).length;
      const expectedProgress = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
      expect(course.progress).toBe(expectedProgress);
      expect(courseProgress(course)).toBe(expectedProgress);
    }
  });

  it('expõe agregados de coleção prontos para a UI', () => {
    for (const collection of MOCK_COLLECTIONS) {
      expect(collection.courseCount).toBe(collection.courses.length);
      expect(collection.totalDuration).toBe(collectionTotalDuration(collection));
      expect(collection.progress).toBe(collectionProgress(collection));
      expect(collection.progress).toBeGreaterThanOrEqual(0);
      expect(collection.progress).toBeLessThanOrEqual(100);
    }
  });
});

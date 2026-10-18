import type { EventBus } from '../../domain/events';
import { organize, type OrganizePlan } from '../../domain/organization';
import type { IndexingStore, ManifestLoader } from '../../domain/ports';
import type { DiscoveredFile } from '../../domain/types';

export interface ApplyOrganizationDependencies {
  store: IndexingStore;
  events: EventBus;
  manifestLoader?: ManifestLoader;
  tracks: { execute(sourceId: string, plan: OrganizePlan): void };
}

/**
 * Rebuilds the logical course tree (collections → courses → sections → modules →
 * lessons → documents) from the discovered files and the optional
 * `.midoteca/course.json` manifest, then links subtitle tracks. Everything is
 * written in a single transaction.
 */
export class ApplyOrganization {
  constructor(private readonly deps: ApplyOrganizationDependencies) {}

  async execute(
    sourceId: string,
    source: { id: string; rootPath: string; libraryType: 'course' | 'movie' },
    discovered: DiscoveredFile[],
  ): Promise<void> {
    const { store, manifestLoader } = this.deps;
    const plan = organize(discovered, {
      rootLabel: source.rootPath.split('/').pop() || source.rootPath,
      libraryType: source.libraryType,
    });

    const manifests = new Map<string, Awaited<ReturnType<ManifestLoader['load']>>>();
    if (manifestLoader) {
      for (const course of plan.courses) {
        const dir =
          course.relativePath === ''
            ? source.rootPath
            : joinPath(source.rootPath, course.relativePath);
        manifests.set(course.relativePath, await manifestLoader.load(dir));
      }
    }

    store.transaction(() => {
      const collectionIds = new Map<string, string>();
      for (const collection of plan.collections) {
        const result = store.upsertCollection({
          sourceId,
          relativePath: collection.relativePath,
          detectedTitle: collection.title,
          sortOrder: collection.order,
        });
        collectionIds.set(collection.relativePath, result.id);
      }

      for (const course of plan.courses) {
        const manifest = manifests.get(course.relativePath) ?? null;
        const courseResult = store.upsertCourse({
          sourceId,
          relativePath: course.relativePath,
          detectedTitle: course.title,
          manifestTitle: manifest?.course?.title ?? null,
          collectionId:
            course.collectionPath !== null
              ? (collectionIds.get(course.collectionPath) ?? null)
              : null,
          category: course.category,
          provider: course.provider,
        });
        this.deps.events.emit('course:organized', {
          courseId: courseResult.id,
          sourceId,
          relativePath: course.relativePath,
          created: courseResult.created,
        });

        for (const section of course.sections) {
          const sectionResult = store.upsertSection({
            courseId: courseResult.id,
            relativePath: section.relativePath,
            detectedTitle: section.title,
            sortOrder: section.order,
          });

          for (const module of section.modules) {
            const moduleResult = store.upsertModule({
              courseId: courseResult.id,
              sectionId: sectionResult.id,
              relativePath: module.relativePath,
              detectedTitle: module.title,
              manifestTitle: manifest?.modules?.[module.relativePath]?.title ?? null,
              sortOrder: module.order,
            });

            for (const lesson of module.lessons) {
              const lessonResult = store.upsertLesson({
                moduleId: moduleResult.id,
                relativePath: lesson.relativePath,
                detectedTitle: lesson.title,
                manifestTitle: manifest?.lessons?.[lesson.relativePath]?.title ?? null,
                sortOrder: lesson.order,
              });
              for (const videoPath of lesson.videos) {
                const media = store.findMediaByPath(sourceId, videoPath);
                if (media) {
                  store.linkLessonMedia(lessonResult.id, media.id, 'primary');
                }
              }
            }

            for (const document of module.documents) {
              const media = store.findMediaByPath(sourceId, document.relativePath);
              if (!media) continue;
              const docResult = store.upsertDocument({
                mediaFileId: media.id,
                detectedTitle: document.title,
              });
              store.linkDocument({
                documentId: docResult.id,
                moduleId: moduleResult.id,
              });
            }
          }
        }

        for (const document of course.documents) {
          const media = store.findMediaByPath(sourceId, document.relativePath);
          if (!media) continue;
          const docResult = store.upsertDocument({
            mediaFileId: media.id,
            detectedTitle: document.title,
          });
          store.linkDocument({
            documentId: docResult.id,
            courseId: courseResult.id,
          });
        }
      }

      for (const document of plan.looseDocuments) {
        const media = store.findMediaByPath(sourceId, document.relativePath);
        if (!media) continue;
        store.upsertDocument({
          mediaFileId: media.id,
          detectedTitle: document.title,
        });
      }

      this.deps.tracks.execute(sourceId, plan);
    });
  }
}

function joinPath(root: string, relative: string): string {
  const separator = root.endsWith('/') ? '' : '/';
  return `${root}${separator}${relative}`;
}

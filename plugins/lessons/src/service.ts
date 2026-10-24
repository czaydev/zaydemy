import { type Database, schema } from "@zaydemy/db";
import { and, asc, eq, exists, isNull, lte, or } from "drizzle-orm";
import { lessons, sections } from "./schema";

/** Reused by the learner page and file downloads, including direct lesson URLs. */
function enrollment(db: Database, userId: string) {
	return exists(
		db
			.select({ id: schema.applications.id })
			.from(schema.applications)
			.where(
				and(
					eq(schema.applications.userId, userId),
					eq(schema.applications.courseId, sections.courseId),
					eq(schema.applications.status, "enrolled"),
				),
			),
	);
}

function openSection(now: Date) {
	return and(
		eq(sections.isPublished, true),
		or(isNull(sections.openAt), lte(sections.openAt, now)),
	);
}

function openLesson(now: Date) {
	return and(eq(lessons.isPublished, true), or(isNull(lessons.openAt), lte(lessons.openAt, now)));
}

export async function enrolledCourses(db: Database, userId: string) {
	return db
		.select({ id: schema.courses.id, name: schema.courses.name })
		.from(schema.courses)
		.where(
			exists(
				db
					.select({ id: schema.applications.id })
					.from(schema.applications)
					.where(
						and(
							eq(schema.applications.courseId, schema.courses.id),
							eq(schema.applications.userId, userId),
							eq(schema.applications.status, "enrolled"),
						),
					),
			),
		)
		.orderBy(asc(schema.courses.name), asc(schema.courses.id));
}

/** Scope both queries in SQL; never load another course's lessons into the page. */
export async function courseContent(
	db: Database,
	courseId: string,
	learnerId?: string,
	now = new Date(),
) {
	const visible =
		learnerId === undefined ? undefined : and(enrollment(db, learnerId), openSection(now));
	const [rows, lessonRows] = await Promise.all([
		db
			.select()
			.from(sections)
			.where(and(eq(sections.courseId, courseId), visible))
			.orderBy(asc(sections.order), asc(sections.id)),
		db
			.select({ lesson: lessons })
			.from(lessons)
			.innerJoin(sections, eq(lessons.sectionId, sections.id))
			.where(
				and(
					eq(sections.courseId, courseId),
					visible,
					learnerId === undefined ? undefined : openLesson(now),
				),
			)
			.orderBy(asc(lessons.order), asc(lessons.id)),
	]);
	const grouped = new Map<string, (typeof lessons.$inferSelect)[]>();
	for (const { lesson } of lessonRows) {
		const list = grouped.get(lesson.sectionId) ?? [];
		list.push(lesson);
		grouped.set(lesson.sectionId, list);
	}
	return rows.map((section) => ({ ...section, lessons: grouped.get(section.id) ?? [] }));
}

export async function readableLesson(
	db: Database,
	userId: string,
	lessonId: string,
	now = new Date(),
) {
	const [row] = await db
		.select({ lesson: lessons, courseId: sections.courseId })
		.from(lessons)
		.innerJoin(sections, eq(lessons.sectionId, sections.id))
		.where(
			and(eq(lessons.id, lessonId), enrollment(db, userId), openSection(now), openLesson(now)),
		);
	return row;
}

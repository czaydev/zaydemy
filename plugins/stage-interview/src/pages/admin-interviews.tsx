import { runtime } from "@zaydemy/core";
import { schema } from "@zaydemy/db";
import { desc, eq } from "drizzle-orm";
import { interviews } from "../schema";

/** Admin list of interviews, newest first. */
export default async function AdminInterviewsPage() {
	const { db } = runtime();
	const rows = await db
		.select({
			id: interviews.id,
			status: interviews.status,
			scheduledAt: interviews.scheduledAt,
			reference: schema.applications.reference,
			applicant: schema.users.name,
		})
		.from(interviews)
		.innerJoin(schema.applications, eq(schema.applications.id, interviews.applicationId))
		.innerJoin(schema.users, eq(schema.users.id, schema.applications.userId))
		.orderBy(desc(interviews.createdAt))
		.limit(100);

	return (
		<main>
			<h1>Interviews</h1>
			<table>
				<thead>
					<tr>
						<th>Application</th>
						<th>Applicant</th>
						<th>Status</th>
						<th>Scheduled</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr key={row.id}>
							<td>{row.reference}</td>
							<td>{row.applicant}</td>
							<td>{row.status}</td>
							<td>{row.scheduledAt?.toISOString() ?? "-"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</main>
	);
}

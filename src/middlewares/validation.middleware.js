import { ZodError } from "zod";

export function validate(schema) {
	return (req, res, next) => {
		try {
			const data = schema.parse(req.body ?? {});
			req.validated = data;
			next();
		} catch (err) {
			if (err instanceof ZodError) {
				const issues = err.issues?.map((i) => ({ path: i.path.join("."), message: i.message }));
				const e = new Error("Validation error");
				e.statusCode = 400;
				e.details = issues;
				return next(e);
			}
			next(err);
		}
	};
}

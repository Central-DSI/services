import prisma from "../config/prisma.js";

export async function findUserByEmail(email) {
	return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id) {
	return prisma.user.findUnique({ where: { id } });
}

export async function updateUserPassword(userId, passwordHash) {
	return prisma.user.update({
		where: { id: userId },
		data: { password: passwordHash },
		select: { id: true },
	});
}


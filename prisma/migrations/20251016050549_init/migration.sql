-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `identity_number` VARCHAR(191) NOT NULL,
    `identity_type` ENUM('NIM', 'NIP', 'OTHER') NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `gender` BOOLEAN NULL,
    `phone_number` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `token` VARCHAR(191) NULL,
    `refresh_token` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_identity_number_key`(`identity_number`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_has_roles` (
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `status` ENUM('active', 'nonActive') NOT NULL,

    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `student_status_id` INTEGER NULL,
    `enrollment_year` INTEGER NULL,

    UNIQUE INDEX `students_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lecturers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `science_group_id` INTEGER NULL,
    `max_supervision_quota` INTEGER NOT NULL DEFAULT 8,

    UNIQUE INDEX `lecturers_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `science_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `academic_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `semester` ENUM('ganjil', 'genap') NOT NULL DEFAULT 'ganjil',
    `year` INTEGER NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `thesis_topic_id` INTEGER NULL,
    `thesis_proposal_id` INTEGER NULL,
    `thesis_status_id` INTEGER NULL,
    `academic_year_id` INTEGER NULL,
    `document_id` INTEGER NULL,
    `title` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `deadline_date` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `lecturer_id` INTEGER NOT NULL,
    `role` ENUM('SUPERVISOR_1', 'SUPERVISOR_2', 'EXAMINER_1', 'EXAMINER_2', 'EXAMINER_3', 'MODERATOR') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_topics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `science_group_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_proposal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `document_id` INTEGER NULL,
    `status` ENUM('submitted', 'accepted', 'rejected') NOT NULL DEFAULT 'submitted',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_progress_components` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_progress_completions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `component_id` INTEGER NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `validated_by_supervisor` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_guidance_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guidance_date` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_guidances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `schedule_id` INTEGER NULL,
    `supervisor_id` INTEGER NULL,
    `student_notes` VARCHAR(191) NULL,
    `supervisor_feedback` VARCHAR(191) NULL,
    `meeting_url` VARCHAR(191) NULL,
    `status` ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_activity_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `activity` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminars` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NOT NULL,
    `schedule_id` INTEGER NULL,
    `result_id` INTEGER NULL,
    `status` ENUM('scheduled', 'rescheduled', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `status` ENUM('planned', 'rescheduled', 'finalized') NOT NULL DEFAULT 'planned',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_result` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_audiences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seminar_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `validated_by` INTEGER NULL,
    `validated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_rubric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year_id` INTEGER NULL,
    `title` VARCHAR(191) NULL,
    `created_by` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_rubric_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rubric_id` INTEGER NOT NULL,
    `indicator` VARCHAR(191) NULL,
    `weight` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_seminar_scores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seminar_id` INTEGER NOT NULL,
    `rubric_detail_id` INTEGER NOT NULL,
    `scored_by` INTEGER NOT NULL,
    `score` INTEGER NULL,
    `comment` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_id` INTEGER NULL,
    `thesis_defence_schedule_id` INTEGER NULL,
    `thesis_defence_status_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defence_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NULL,
    `start_time` DATETIME(3) NULL,
    `end_time` DATETIME(3) NULL,
    `status` ENUM('planned', 'scheduled', 'finalized', 'cancelled') NOT NULL DEFAULT 'planned',
    `supervisor_approval` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defence_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defence_rubrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `academic_year_id` INTEGER NULL,
    `title` VARCHAR(191) NULL,
    `created_by` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defence_rubric_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rubric_id` INTEGER NOT NULL,
    `indicator` VARCHAR(191) NULL,
    `weight` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_defence_scores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `thesis_defence_id` INTEGER NOT NULL,
    `rubric_detail_id` INTEGER NOT NULL,
    `scored_by` INTEGER NOT NULL,
    `score` INTEGER NULL,
    `reviewer_note` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yudisiums` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `yudisium_schedule_id` INTEGER NULL,
    `yudisium_decree` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yudisium_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NULL,
    `schedule` DATETIME(3) NULL,
    `status` ENUM('planned', 'finalized', 'completed') NOT NULL DEFAULT 'planned',
    `department_head_approval` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yudisium_applicants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `yudisium_applicant_status_id` INTEGER NULL,
    `is_eligible` BOOLEAN NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yudisium_applicant_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yudisium_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `yudisium_id` INTEGER NOT NULL,
    `yudisium_applicant_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `document_type_id` INTEGER NULL,
    `file_path` VARCHAR(191) NULL,
    `file_name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `file_path` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `canvas_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` INTEGER NULL,
    `user_id` INTEGER NULL,
    `annotations` JSON NULL,
    `version` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `thesis_proposal_grades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `proposal_id` INTEGER NULL,
    `grade` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `research_method_grades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NULL,
    `grade` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `company_address` VARCHAR(191) NULL,
    `field_supervisor` VARCHAR(191) NULL,
    `field_supervisor_phone` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `status` ENUM('ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'ongoing',
    `report_document_id` INTEGER NULL,
    `proposal_document_id` INTEGER NULL,
    `certificate_document_id` INTEGER NULL,
    `academic_year_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_internships_student`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_supervisors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `lecturer_id` INTEGER NULL,
    `external_supervisor_name` VARCHAR(191) NULL,
    `role` ENUM('LECTURER', 'FIELD_SUPERVISOR') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `entry_date` DATETIME(3) NOT NULL,
    `activity_description` VARCHAR(191) NULL,
    `validated_by_supervisor` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_internship_reports_internship`(`internship_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `assessorType` ENUM('LECTURER', 'FIELD_SUPERVISOR') NOT NULL,
    `assessor_id` INTEGER NULL,
    `score` DOUBLE NULL,
    `comments` VARCHAR(191) NULL,
    `raw_image_document_id` INTEGER NULL,
    `ocr_text` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_internship_assessments_internship`(`internship_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_seminars` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `schedule_id` INTEGER NULL,
    `result_id` INTEGER NULL,
    `status` ENUM('scheduled', 'rescheduled', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `role` ENUM('SECRETARY', 'ADMIN', 'LECTURER') NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `notes` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_guidance_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `lecturer_id` INTEGER NOT NULL,
    `meeting_date` DATETIME(3) NOT NULL,
    `status` ENUM('requested', 'approved', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
    `student_notes` VARCHAR(191) NULL,
    `lecturer_feedback` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `internship_seminar_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `internship_id` INTEGER NOT NULL,
    `room_id` INTEGER NOT NULL,
    `requested_by` INTEGER NOT NULL,
    `approved_by` INTEGER NULL,
    `status` ENUM('requested', 'approved', 'cancelled', 'completed') NOT NULL DEFAULT 'requested',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,

    INDEX `idx_internship_seminar_bookings_room`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_has_roles` ADD CONSTRAINT `user_has_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_has_roles` ADD CONSTRAINT `user_has_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `user_roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_student_status_id_fkey` FOREIGN KEY (`student_status_id`) REFERENCES `student_status`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturers` ADD CONSTRAINT `lecturers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lecturers` ADD CONSTRAINT `lecturers_science_group_id_fkey` FOREIGN KEY (`science_group_id`) REFERENCES `science_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_thesis_topic_id_fkey` FOREIGN KEY (`thesis_topic_id`) REFERENCES `thesis_topics`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_thesis_proposal_id_fkey` FOREIGN KEY (`thesis_proposal_id`) REFERENCES `thesis_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_thesis_status_id_fkey` FOREIGN KEY (`thesis_status_id`) REFERENCES `thesis_status`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis` ADD CONSTRAINT `thesis_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_participants` ADD CONSTRAINT `thesis_participants_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_participants` ADD CONSTRAINT `thesis_participants_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_topics` ADD CONSTRAINT `thesis_topics_science_group_id_fkey` FOREIGN KEY (`science_group_id`) REFERENCES `science_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_proposal` ADD CONSTRAINT `thesis_proposal_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_proposal` ADD CONSTRAINT `thesis_proposal_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_progress_completions` ADD CONSTRAINT `thesis_progress_completions_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_progress_completions` ADD CONSTRAINT `thesis_progress_completions_component_id_fkey` FOREIGN KEY (`component_id`) REFERENCES `thesis_progress_components`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_guidances` ADD CONSTRAINT `thesis_guidances_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_guidances` ADD CONSTRAINT `thesis_guidances_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `thesis_guidance_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_guidances` ADD CONSTRAINT `thesis_guidances_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `lecturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_activity_logs` ADD CONSTRAINT `thesis_activity_logs_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_activity_logs` ADD CONSTRAINT `thesis_activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminars` ADD CONSTRAINT `thesis_seminars_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminars` ADD CONSTRAINT `thesis_seminars_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `thesis_seminar_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminars` ADD CONSTRAINT `thesis_seminars_result_id_fkey` FOREIGN KEY (`result_id`) REFERENCES `thesis_seminar_result`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_schedules` ADD CONSTRAINT `thesis_seminar_schedules_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_audiences` ADD CONSTRAINT `thesis_seminar_audiences_seminar_id_fkey` FOREIGN KEY (`seminar_id`) REFERENCES `thesis_seminars`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_audiences` ADD CONSTRAINT `thesis_seminar_audiences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_audiences` ADD CONSTRAINT `thesis_seminar_audiences_validated_by_fkey` FOREIGN KEY (`validated_by`) REFERENCES `lecturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_rubric` ADD CONSTRAINT `thesis_seminar_rubric_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_rubric` ADD CONSTRAINT `thesis_seminar_rubric_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_rubric_details` ADD CONSTRAINT `thesis_seminar_rubric_details_rubric_id_fkey` FOREIGN KEY (`rubric_id`) REFERENCES `thesis_seminar_rubric`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_scores` ADD CONSTRAINT `thesis_seminar_scores_seminar_id_fkey` FOREIGN KEY (`seminar_id`) REFERENCES `thesis_seminars`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_scores` ADD CONSTRAINT `thesis_seminar_scores_rubric_detail_id_fkey` FOREIGN KEY (`rubric_detail_id`) REFERENCES `thesis_seminar_rubric_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_seminar_scores` ADD CONSTRAINT `thesis_seminar_scores_scored_by_fkey` FOREIGN KEY (`scored_by`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defences` ADD CONSTRAINT `thesis_defences_thesis_id_fkey` FOREIGN KEY (`thesis_id`) REFERENCES `thesis`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defences` ADD CONSTRAINT `thesis_defences_thesis_defence_schedule_id_fkey` FOREIGN KEY (`thesis_defence_schedule_id`) REFERENCES `thesis_defence_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defences` ADD CONSTRAINT `thesis_defences_thesis_defence_status_id_fkey` FOREIGN KEY (`thesis_defence_status_id`) REFERENCES `thesis_defence_status`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_schedules` ADD CONSTRAINT `thesis_defence_schedules_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_rubrics` ADD CONSTRAINT `thesis_defence_rubrics_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_rubrics` ADD CONSTRAINT `thesis_defence_rubrics_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_rubric_details` ADD CONSTRAINT `thesis_defence_rubric_details_rubric_id_fkey` FOREIGN KEY (`rubric_id`) REFERENCES `thesis_defence_rubrics`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_scores` ADD CONSTRAINT `thesis_defence_scores_thesis_defence_id_fkey` FOREIGN KEY (`thesis_defence_id`) REFERENCES `thesis_defences`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_scores` ADD CONSTRAINT `thesis_defence_scores_rubric_detail_id_fkey` FOREIGN KEY (`rubric_detail_id`) REFERENCES `thesis_defence_rubric_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_defence_scores` ADD CONSTRAINT `thesis_defence_scores_scored_by_fkey` FOREIGN KEY (`scored_by`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisiums` ADD CONSTRAINT `yudisiums_yudisium_schedule_id_fkey` FOREIGN KEY (`yudisium_schedule_id`) REFERENCES `yudisium_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisium_schedules` ADD CONSTRAINT `yudisium_schedules_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisium_applicants` ADD CONSTRAINT `yudisium_applicants_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisium_applicants` ADD CONSTRAINT `yudisium_applicants_yudisium_applicant_status_id_fkey` FOREIGN KEY (`yudisium_applicant_status_id`) REFERENCES `yudisium_applicant_status`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisium_participants` ADD CONSTRAINT `yudisium_participants_yudisium_id_fkey` FOREIGN KEY (`yudisium_id`) REFERENCES `yudisiums`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yudisium_participants` ADD CONSTRAINT `yudisium_participants_yudisium_applicant_id_fkey` FOREIGN KEY (`yudisium_applicant_id`) REFERENCES `yudisium_applicants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_document_type_id_fkey` FOREIGN KEY (`document_type_id`) REFERENCES `document_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canvas_files` ADD CONSTRAINT `canvas_files_document_id_fkey` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canvas_files` ADD CONSTRAINT `canvas_files_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `thesis_proposal_grades` ADD CONSTRAINT `thesis_proposal_grades_proposal_id_fkey` FOREIGN KEY (`proposal_id`) REFERENCES `thesis_proposal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `research_method_grades` ADD CONSTRAINT `research_method_grades_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_report_document_id_fkey` FOREIGN KEY (`report_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_proposal_document_id_fkey` FOREIGN KEY (`proposal_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_certificate_document_id_fkey` FOREIGN KEY (`certificate_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internships` ADD CONSTRAINT `internships_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_supervisors` ADD CONSTRAINT `internship_supervisors_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_supervisors` ADD CONSTRAINT `internship_supervisors_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_reports` ADD CONSTRAINT `internship_reports_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_assessments` ADD CONSTRAINT `internship_assessments_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_assessments` ADD CONSTRAINT `internship_assessments_raw_image_document_id_fkey` FOREIGN KEY (`raw_image_document_id`) REFERENCES `documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminars` ADD CONSTRAINT `internship_seminars_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminars` ADD CONSTRAINT `internship_seminars_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `thesis_seminar_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminars` ADD CONSTRAINT `internship_seminars_result_id_fkey` FOREIGN KEY (`result_id`) REFERENCES `thesis_seminar_result`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_approvals` ADD CONSTRAINT `internship_approvals_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_approvals` ADD CONSTRAINT `internship_approvals_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_guidance_schedules` ADD CONSTRAINT `internship_guidance_schedules_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_guidance_schedules` ADD CONSTRAINT `internship_guidance_schedules_lecturer_id_fkey` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminar_bookings` ADD CONSTRAINT `internship_seminar_bookings_internship_id_fkey` FOREIGN KEY (`internship_id`) REFERENCES `internships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminar_bookings` ADD CONSTRAINT `internship_seminar_bookings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminar_bookings` ADD CONSTRAINT `internship_seminar_bookings_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internship_seminar_bookings` ADD CONSTRAINT `internship_seminar_bookings_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

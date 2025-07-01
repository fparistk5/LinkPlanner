-- First, update any notes that reference the General note group to have null note_group_id
UPDATE notes
SET note_group_id = NULL
WHERE note_group_id IN (
    SELECT id 
    FROM note_groups 
    WHERE name = 'General'
);

-- Then delete the General note groups
DELETE FROM note_groups
WHERE name = 'General'; 
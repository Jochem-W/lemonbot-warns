import {APIApplicationCommandPermission, ApplicationCommandPermissionType} from "discord-api-types/v10"
import {
    ApplicationCommandPermissions,
    GuildMember,
    Message,
    Role,
    RoleResolvable,
    Snowflake,
    ThreadMember,
    User,
    UserResolvable,
} from "discord.js"
import {Config} from "../config"

/**
 * Helper class to easily work with application command permissions.
 */
export default class CommandPermissionBuilder {
    private readonly rolePermissions: Map<Snowflake, boolean> = new Map()
    private readonly userPermissions: Map<Snowflake, boolean> = new Map()

    /**
     * Return the current permissions.
     */
    get permissions(): ApplicationCommandPermissions[] {
        return [...Array.from(this.rolePermissions).map(([id, permission]) => {
            return {
                type: ApplicationCommandPermissionType.Role,
                permission: permission,
                id: id,
            }
        }), ...Array.from(this.userPermissions).map(([id, permission]) => {
            return {
                type: ApplicationCommandPermissionType.User,
                permission: permission,
                id: id,
            }
        })] as ApplicationCommandPermissions[]
    }

    static getDefault() {
        const builder = new CommandPermissionBuilder()
        for (const roleId of Config.allowedRoleIds) {
            builder.setRolePermission(roleId, true)
        }

        for (const userId of Config.allowedUserIds) {
            builder.setUserPermission(userId, true)
        }

        return builder
    }

    /**
     * Set permissions for a role.
     * @param role The role to set permissions for.
     * @param permission Whether to allow or deny the command, or undefined to remove the override.
     */
    setRolePermission(role: RoleResolvable, permission?: boolean) {
        const key = role instanceof Role ? role.id : role
        if (permission === undefined) {
            this.rolePermissions.delete(key)
        } else {
            this.rolePermissions.set(key, permission)
        }

        return this
    }

    /**
     * Set permissions for a user.
     * @param user The user to set permissions for.
     * @param permission Whether to allow or deny the command, or undefined to remove the override.
     */
    setUserPermission(user: UserResolvable, permission?: boolean) {
        let key
        if (user instanceof User || user instanceof GuildMember || user instanceof ThreadMember) {
            key = user.id
        } else if (user instanceof Message) {
            key = user.author.id
        } else {
            key = user
        }

        if (permission === undefined) {
            this.userPermissions.delete(key)
        } else {
            this.userPermissions.set(key, permission)
        }

        return this
    }

    /**
     * Return the JSON representation of the permissions.
     */
    toJSON(): APIApplicationCommandPermission[] {
        return [
            ...Array.from(this.rolePermissions).map(([key, value]) => ({
                id: key,
                type: ApplicationCommandPermissionType.Role,
                permission: value,
            })),
            ...Array.from(this.userPermissions).map(([key, value]) => ({
                id: key,
                type: ApplicationCommandPermissionType.User,
                permission: value,
            })),
        ]
    }
}
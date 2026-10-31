// @ts-nocheck
/* eslint-disable */
import { createElement, useMemo, type ComponentType, type JSX } from "react";
import { useTranslation, Trans, type TransProps } from "react-i18next";
type TypedTransProps<Value, Components, Context extends string | undefined = undefined> = Omit<TransProps<string, never, never, Context>, "values" | "ns" | "i18nKey"> & ({} extends Value ? {} : {
    values: Value;
}) & {
    components: Components;
};
function createProxy(initValue: (key: string) => any) {
    function define(key: string) {
        const value = initValue(key);
        Object.defineProperty(container, key, { value, configurable: true });
        return value;
    }
    const container = {
        __proto__: new Proxy({ __proto__: null }, {
            get(_, key) {
                if (typeof key === "symbol")
                    return undefined;
                return define(key);
            },
        }),
    };
    return new Proxy(container, {
        getPrototypeOf: () => null,
        setPrototypeOf: (_, v) => v === null,
        getOwnPropertyDescriptor: (_, key) => {
            if (typeof key === "symbol")
                return undefined;
            if (!(key in container))
                define(key);
            return Object.getOwnPropertyDescriptor(container, key);
        },
    });
}
export function useAFFiNEI18N(): {
    /**
      * `Back to my Content`
      */
    ["404.back"](): string;
    /**
      * `Sorry, you do not have access or this content does not exist...`
      */
    ["404.hint"](): string;
    /**
      * `Sign in to another account`
      */
    ["404.signOut"](): string;
    /**
      * `BrightLoop Cloud`
      */
    ["BrightLoop Cloud"](): string;
    /**
      * `All docs`
      */
    ["All pages"](): string;
    /**
      * `App version`
      */
    ["App Version"](): string;
    /**
      * `Available offline`
      */
    ["Available Offline"](): string;
    /**
      * `Bold`
      */
    Bold(): string;
    /**
      * `Cancel`
      */
    Cancel(): string;
    /**
      * `Click to replace photo`
      */
    ["Click to replace photo"](): string;
    /**
      * `Collections`
      */
    Collections(): string;
    /**
      * `Complete`
      */
    Complete(): string;
    /**
      * `Confirm`
      */
    Confirm(): string;
    /**
      * `Continue`
      */
    Continue(): string;
    /**
      * `Convert to `
      */
    ["Convert to "](): string;
    /**
      * `Copied link to clipboard`
      */
    ["Copied link to clipboard"](): string;
    /**
      * `Copy`
      */
    Copy(): string;
    /**
      * `Create`
      */
    Create(): string;
    /**
      * `Created`
      */
    Created(): string;
    /**
      * `Customise`
      */
    Customize(): string;
    /**
      * `Colors`
      */
    Colors(): string;
    /**
      * `Database file already loaded`
      */
    DB_FILE_ALREADY_LOADED(): string;
    /**
      * `Invalid database file`
      */
    DB_FILE_INVALID(): string;
    /**
      * `Database file migration failed`
      */
    DB_FILE_MIGRATION_FAILED(): string;
    /**
      * `Database file path invalid`
      */
    DB_FILE_PATH_INVALID(): string;
    /**
      * `Date`
      */
    Date(): string;
    /**
      * `Delete`
      */
    Delete(): string;
    /**
      * `Deleted`
      */
    Deleted(): string;
    /**
      * `Disable`
      */
    Disable(): string;
    /**
      * `Disable public sharing`
      */
    ["Disable Public Sharing"](): string;
    /**
      * `Disable snapshot`
      */
    ["Disable Snapshot"](): string;
    /**
      * `Divider`
      */
    Divider(): string;
    /**
      * `Edgeless`
      */
    Edgeless(): string;
    /**
      * `Edit`
      */
    Edit(): string;
    /**
      * `Editor version`
      */
    ["Editor Version"](): string;
    /**
      * `Enable`
      */
    Enable(): string;
    /**
      * `Enable BrightLoop Cloud`
      */
    ["Enable BrightLoop Cloud"](): string;
    /**
      * `If enabled, the data in this workspace will be backed up and synchronised via BrightLoop Cloud.`
      */
    ["Enable BrightLoop Cloud Description"](): string;
    /**
      * `The following functions rely on BrightLoop Cloud. All data is stored on the current device. You can enable BrightLoop Cloud for this workspace to keep data in sync with the cloud.`
      */
    ["Enable cloud hint"](): string;
    /**
      * `Full Backup`
      */
    ["Full Backup"](): string;
    /**
      * `Export a complete workspace backup`
      */
    ["Full Backup Description"](): string;
    /**
      * `Sync all cloud data and export a complete workspace backup`
      */
    ["Full Backup Hint"](): string;
    /**
      * `Quick Export`
      */
    ["Quick Export"](): string;
    /**
      * `Skip cloud synchronization and quickly export current data(some attachments or docs may be missing)`
      */
    ["Quick Export Description"](): string;
    /**
      * `Export failed`
      */
    ["Export failed"](): string;
    /**
      * `Export success`
      */
    ["Export success"](): string;
    /**
      * `Export to HTML`
      */
    ["Export to HTML"](): string;
    /**
      * `Export to Markdown`
      */
    ["Export to Markdown"](): string;
    /**
      * `Export to PNG`
      */
    ["Export to PNG"](): string;
    /**
      * `File already exists`
      */
    FILE_ALREADY_EXISTS(): string;
    /**
      * `Favourite`
      */
    Favorite(): string;
    /**
      * `Favourited`
      */
    Favorited(): string;
    /**
      * `Favourites`
      */
    Favorites(): string;
    /**
      * `Feedback`
      */
    Feedback(): string;
    /**
      * `Found 0 results`
      */
    ["Find 0 result"](): string;
    /**
      * `Go back`
      */
    ["Go Back"](): string;
    /**
      * `Go forward`
      */
    ["Go Forward"](): string;
    /**
      * `Got it`
      */
    ["Got it"](): string;
    /**
      * `Heading {{number}}`
      */
    Heading(options: {
        readonly number: string;
    }): string;
    /**
      * `Image`
      */
    Image(): string;
    /**
      * `Import`
      */
    Import(): string;
    /**
      * `Info`
      */
    Info(): string;
    /**
      * `Invitation sent`
      */
    ["Invitation sent"](): string;
    /**
      * `Invited members have been notified with email to join this Workspace.`
      */
    ["Invitation sent hint"](): string;
    /**
      * `Invite`
      */
    Invite(): string;
    /**
      * `Invite members`
      */
    ["Invite Members"](): string;
    /**
      * `Invited members will collaborate with you in current workspace`
      */
    ["Invite Members Message"](): string;
    /**
      * `Insufficient team seat`
      */
    ["insufficient-team-seat"](): string;
    /**
      * `Joined workspace`
      */
    ["Joined Workspace"](): string;
    /**
      * `Leave`
      */
    Leave(): string;
    /**
      * `Hyperlink (with selected text)`
      */
    Link(): string;
    /**
      * `Loading...`
      */
    Loading(): string;
    /**
      * `Local`
      */
    Local(): string;
    /**
      * `Member`
      */
    Member(): string;
    /**
      * `Members`
      */
    Members(): string;
    /**
      * `Manage members here, invite new member by email.`
      */
    ["Members hint"](): string;
    /**
      * `New doc`
      */
    ["New Page"](): string;
    /**
      * `Owner`
      */
    Owner(): string;
    /**
      * `Page`
      */
    Page(): string;
    /**
      * `Pen`
      */
    Pen(): string;
    /**
      * `Pending`
      */
    Pending(): string;
    /**
      * `Collaborator`
      */
    Collaborator(): string;
    /**
      * `Under Review`
      */
    ["Under-Review"](): string;
    /**
      * `Need More Seats`
      */
    ["Need-More-Seats"](): string;
    /**
      * `Admin`
      */
    Admin(): string;
    /**
      * `Publish`
      */
    Publish(): string;
    /**
      * `Published to web`
      */
    ["Published to Web"](): string;
    /**
      * `Quick search`
      */
    ["Quick Search"](): string;
    /**
      * `Search`
      */
    ["Quick search"](): string;
    /**
      * `Recent`
      */
    Recent(): string;
    /**
      * `Remove from workspace`
      */
    ["Remove from workspace"](): string;
    /**
      * `Remove photo`
      */
    ["Remove photo"](): string;
    /**
      * `Remove special filter`
      */
    ["Remove special filter"](): string;
    /**
      * `Removed successfully`
      */
    ["Removed successfully"](): string;
    /**
      * `Rename`
      */
    Rename(): string;
    /**
      * `Retry`
      */
    Retry(): string;
    /**
      * `Save`
      */
    Save(): string;
    /**
      * `Select`
      */
    Select(): string;
    /**
      * `Sign in`
      */
    ["Sign in"](): string;
    /**
      * `Sign in and enable`
      */
    ["Sign in and Enable"](): string;
    /**
      * `Sign out`
      */
    ["Sign out"](): string;
    /**
      * `Snapshot`
      */
    Snapshot(): string;
    /**
      * `Storage`
      */
    Storage(): string;
    /**
      * `Storage and export`
      */
    ["Storage and Export"](): string;
    /**
      * `Successfully deleted`
      */
    ["Successfully deleted"](): string;
    /**
      * `Successfully joined!`
      */
    ["Successfully joined!"](): string;
    /**
      * `Switch`
      */
    Switch(): string;
    /**
      * `Switch view`
      */
    switchView(): string;
    /**
      * `Sync`
      */
    Sync(): string;
    /**
      * `Synced with BrightLoop Cloud`
      */
    ["Synced with BrightLoop Cloud"](): string;
    /**
      * `Tags`
      */
    Tags(): string;
    /**
      * `Text`
      */
    Text(): string;
    /**
      * `Theme`
      */
    Theme(): string;
    /**
      * `Title`
      */
    Title(): string;
    /**
      * `Trash`
      */
    Trash(): string;
    /**
      * `Unknown error`
      */
    UNKNOWN_ERROR(): string;
    /**
      * `Undo`
      */
    Undo(): string;
    /**
      * `Unpin`
      */
    Unpin(): string;
    /**
      * `Untitled`
      */
    Untitled(): string;
    /**
      * `Update workspace name success`
      */
    ["Update workspace name success"](): string;
    /**
      * `Updated`
      */
    Updated(): string;
    /**
      * `Upload`
      */
    Upload(): string;
    /**
      * `Users`
      */
    Users(): string;
    /**
      * `Version`
      */
    Version(): string;
    /**
      * `Visit workspace`
      */
    ["Visit Workspace"](): string;
    /**
      * `Workspace name`
      */
    ["Workspace Name"](): string;
    /**
      * `Workspace Owner`
      */
    ["Workspace Owner"](): string;
    /**
      * `Workspace profile`
      */
    ["Workspace Profile"](): string;
    /**
      * `Workspace settings`
      */
    ["Workspace Settings"](): string;
    /**
      * `{{name}}'s settings`
      */
    ["Workspace Settings with name"](options: {
        readonly name: string;
    }): string;
    /**
      * `{{name}} is saved locally`
      */
    ["Workspace saved locally"](options: {
        readonly name: string;
    }): string;
    /**
      * `Zoom in`
      */
    ["Zoom in"](): string;
    /**
      * `Zoom out`
      */
    ["Zoom out"](): string;
    /**
      * `Unknown User`
      */
    ["Unknown User"](): string;
    /**
      * `Deleted User`
      */
    ["Deleted User"](): string;
    /**
      * `all`
      */
    all(): string;
    /**
      * `current`
      */
    current(): string;
    /**
      * `Automatically check for new updates periodically.`
      */
    ["com.BrightLoop.aboutBrightLoop.autoCheckUpdate.description"](): string;
    /**
      * `Check for updates automatically`
      */
    ["com.BrightLoop.aboutBrightLoop.autoCheckUpdate.title"](): string;
    /**
      * `Automatically download updates (to this device).`
      */
    ["com.BrightLoop.aboutBrightLoop.autoDownloadUpdate.description"](): string;
    /**
      * `Download updates automatically`
      */
    ["com.BrightLoop.aboutBrightLoop.autoDownloadUpdate.title"](): string;
    /**
      * `View the BrightLoop Changelog.`
      */
    ["com.BrightLoop.aboutBrightLoop.changelog.description"](): string;
    /**
      * `Discover what's new`
      */
    ["com.BrightLoop.aboutBrightLoop.changelog.title"](): string;
    /**
      * `Check for update`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.button.check"](): string;
    /**
      * `Download update`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.button.download"](): string;
    /**
      * `Restart to update`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.button.restart"](): string;
    /**
      * `Retry`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.button.retry"](): string;
    /**
      * `New version is ready`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.description"](): string;
    /**
      * `Manually check for updates.`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.check"](): string;
    /**
      * `Checking for updates...`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.checking"](): string;
    /**
      * `Downloading the latest version...`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.downloading"](): string;
    /**
      * `Unable to connect to the update server.`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.error"](): string;
    /**
      * `You've got the latest version of BrightLoop.`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.latest"](): string;
    /**
      * `Restart to apply update.`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.restart"](): string;
    /**
      * `New update available ({{version}})`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.subtitle.update-available"](options: {
        readonly version: string;
    }): string;
    /**
      * `Check for updates`
      */
    ["com.BrightLoop.aboutBrightLoop.checkUpdate.title"](): string;
    /**
      * `Communities`
      */
    ["com.BrightLoop.aboutBrightLoop.community.title"](): string;
    /**
      * `BrightLoop community`
      */
    ["com.BrightLoop.aboutBrightLoop.contact.community"](): string;
    /**
      * `Contact us`
      */
    ["com.BrightLoop.aboutBrightLoop.contact.title"](): string;
    /**
      * `Official website`
      */
    ["com.BrightLoop.aboutBrightLoop.contact.website"](): string;
    /**
      * `Privacy`
      */
    ["com.BrightLoop.aboutBrightLoop.legal.privacy"](): string;
    /**
      * `Legal Info`
      */
    ["com.BrightLoop.aboutBrightLoop.legal.title"](): string;
    /**
      * `Terms of use`
      */
    ["com.BrightLoop.aboutBrightLoop.legal.tos"](): string;
    /**
      * `Information about BrightLoop`
      */
    ["com.BrightLoop.aboutBrightLoop.subtitle"](): string;
    /**
      * `About BrightLoop`
      */
    ["com.BrightLoop.aboutBrightLoop.title"](): string;
    /**
      * `App version`
      */
    ["com.BrightLoop.aboutBrightLoop.version.app"](): string;
    /**
      * `Editor version`
      */
    ["com.BrightLoop.aboutBrightLoop.version.editor.title"](): string;
    /**
      * `Version`
      */
    ["com.BrightLoop.aboutBrightLoop.version.title"](): string;
    /**
      * `Get started`
      */
    ["com.BrightLoop.ai-onboarding.edgeless.get-started"](): string;
    /**
      * `Lets you think bigger, create faster, work smarter and save time for every project.`
      */
    ["com.BrightLoop.ai-onboarding.edgeless.message"](): string;
    /**
      * `Upgrade to unlimited usage`
      */
    ["com.BrightLoop.ai-onboarding.edgeless.purchase"](): string;
    /**
      * `Right-clicking to select content AI`
      */
    ["com.BrightLoop.ai-onboarding.edgeless.title"](): string;
    /**
      * `Lets you think bigger, create faster, work smarter and save time for every project.`
      */
    ["com.BrightLoop.ai-onboarding.general.1.description"](): string;
    /**
      * `Meet BrightLoop AI`
      */
    ["com.BrightLoop.ai-onboarding.general.1.title"](): string;
    /**
      * `Answer questions, draft docs, visualize ideas - BrightLoop AI can save you time at every possible step. Powered by GPT's most powerful model.`
      */
    ["com.BrightLoop.ai-onboarding.general.2.description"](): string;
    /**
      * `Chat with BrightLoop AI`
      */
    ["com.BrightLoop.ai-onboarding.general.2.title"](): string;
    /**
      * `Get insightful answer to any question, instantly.`
      */
    ["com.BrightLoop.ai-onboarding.general.3.description"](): string;
    /**
      * `Edit inline with BrightLoop AI`
      */
    ["com.BrightLoop.ai-onboarding.general.3.title"](): string;
    /**
      * `Expand thinking. Untangle complexity. Breakdown and visualise your content with crafted mindmap and presentable slides with one click.`
      */
    ["com.BrightLoop.ai-onboarding.general.4.description"](): string;
    /**
      * `Make mind-map and presents with AI`
      */
    ["com.BrightLoop.ai-onboarding.general.4.title"](): string;
    /**
      * `BrightLoop AI is ready`
      */
    ["com.BrightLoop.ai-onboarding.general.5.title"](): string;
    /**
      * `Get started`
      */
    ["com.BrightLoop.ai-onboarding.general.get-started"](): string;
    /**
      * `Next`
      */
    ["com.BrightLoop.ai-onboarding.general.next"](): string;
    /**
      * `Back`
      */
    ["com.BrightLoop.ai-onboarding.general.prev"](): string;
    /**
      * `Get unlimited usage`
      */
    ["com.BrightLoop.ai-onboarding.general.purchase"](): string;
    /**
      * `Remind me later`
      */
    ["com.BrightLoop.ai-onboarding.general.skip"](): string;
    /**
      * `Try for free`
      */
    ["com.BrightLoop.ai-onboarding.general.try-for-free"](): string;
    /**
      * `Dismiss`
      */
    ["com.BrightLoop.ai-onboarding.local.action-dismiss"](): string;
    /**
      * `Get started`
      */
    ["com.BrightLoop.ai-onboarding.local.action-get-started"](): string;
    /**
      * `Learn more`
      */
    ["com.BrightLoop.ai-onboarding.local.action-learn-more"](): string;
    /**
      * `Lets you think bigger, create faster, work smarter and save time for every project.`
      */
    ["com.BrightLoop.ai-onboarding.local.message"](): string;
    /**
      * `Meet BrightLoop AI`
      */
    ["com.BrightLoop.ai-onboarding.local.title"](): string;
    /**
      * `New`
      */
    ["com.BrightLoop.ai-scroll-tip.tag"](): string;
    /**
      * `Meet BrightLoop AI`
      */
    ["com.BrightLoop.ai-scroll-tip.title"](): string;
    /**
      * `View`
      */
    ["com.BrightLoop.ai-scroll-tip.view"](): string;
    /**
      * `Please switch to edgeless mode`
      */
    ["com.BrightLoop.ai.action.edgeless-only.dialog-title"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.ai.login-required.dialog-cancel"](): string;
    /**
      * `Sign in`
      */
    ["com.BrightLoop.ai.login-required.dialog-confirm"](): string;
    /**
      * `To use BrightLoop AI, please sign in to your BrightLoop Cloud account.`
      */
    ["com.BrightLoop.ai.login-required.dialog-content"](): string;
    /**
      * `Sign in to continue`
      */
    ["com.BrightLoop.ai.login-required.dialog-title"](): string;
    /**
      * `Failed to insert template, please try again.`
      */
    ["com.BrightLoop.ai.template-insert.failed"](): string;
    /**
      * `All docs`
      */
    ["com.BrightLoop.all-pages.header"](): string;
    /**
      * `Learn more`
      */
    ["com.BrightLoop.app-sidebar.learn-more"](): string;
    /**
      * `Star us`
      */
    ["com.BrightLoop.app-sidebar.star-us"](): string;
    /**
      * `Download update`
      */
    ["com.BrightLoop.appUpdater.downloadUpdate"](): string;
    /**
      * `Downloading`
      */
    ["com.BrightLoop.appUpdater.downloading"](): string;
    /**
      * `Restart to install update`
      */
    ["com.BrightLoop.appUpdater.installUpdate"](): string;
    /**
      * `Open download page`
      */
    ["com.BrightLoop.appUpdater.openDownloadPage"](): string;
    /**
      * `Update available`
      */
    ["com.BrightLoop.appUpdater.updateAvailable"](): string;
    /**
      * `Discover what's new!`
      */
    ["com.BrightLoop.appUpdater.whatsNew"](): string;
    /**
      * `Customise the appearance of the client.`
      */
    ["com.BrightLoop.appearanceSettings.clientBorder.description"](): string;
    /**
      * `Client border style`
      */
    ["com.BrightLoop.appearanceSettings.clientBorder.title"](): string;
    /**
      * `Choose your colour mode`
      */
    ["com.BrightLoop.appearanceSettings.color.description"](): string;
    /**
      * `Colour mode`
      */
    ["com.BrightLoop.appearanceSettings.color.title"](): string;
    /**
      * `Edit all BrightLoop theme variables here`
      */
    ["com.BrightLoop.appearanceSettings.customize-theme.description"](): string;
    /**
      * `Customize Theme`
      */
    ["com.BrightLoop.appearanceSettings.customize-theme.title"](): string;
    /**
      * `Reset all`
      */
    ["com.BrightLoop.appearanceSettings.customize-theme.reset"](): string;
    /**
      * `Open Theme Editor`
      */
    ["com.BrightLoop.appearanceSettings.customize-theme.open"](): string;
    /**
      * `Choose your font style`
      */
    ["com.BrightLoop.appearanceSettings.font.description"](): string;
    /**
      * `Font style`
      */
    ["com.BrightLoop.appearanceSettings.font.title"](): string;
    /**
      * `Mono`
      */
    ["com.BrightLoop.appearanceSettings.fontStyle.mono"](): string;
    /**
      * `Sans`
      */
    ["com.BrightLoop.appearanceSettings.fontStyle.sans"](): string;
    /**
      * `Serif`
      */
    ["com.BrightLoop.appearanceSettings.fontStyle.serif"](): string;
    /**
      * `Select the language for the interface.`
      */
    ["com.BrightLoop.appearanceSettings.language.description"](): string;
    /**
      * `Display language`
      */
    ["com.BrightLoop.appearanceSettings.language.title"](): string;
    /**
      * `Use background noise effect on the sidebar.`
      */
    ["com.BrightLoop.appearanceSettings.noisyBackground.description"](): string;
    /**
      * `Noise background on the sidebar`
      */
    ["com.BrightLoop.appearanceSettings.noisyBackground.title"](): string;
    /**
      * `Sidebar`
      */
    ["com.BrightLoop.appearanceSettings.sidebar.title"](): string;
    /**
      * `Customize your BrightLoop appearance`
      */
    ["com.BrightLoop.appearanceSettings.subtitle"](): string;
    /**
      * `Menubar`
      */
    ["com.BrightLoop.appearanceSettings.menubar.title"](): string;
    /**
      * `Enable menubar app`
      */
    ["com.BrightLoop.appearanceSettings.menubar.toggle"](): string;
    /**
      * `Display the menubar app in the tray for quick access to BrightLoop or meeting recordings.`
      */
    ["com.BrightLoop.appearanceSettings.menubar.description"](): string;
    /**
      * `Theme`
      */
    ["com.BrightLoop.appearanceSettings.theme.title"](): string;
    /**
      * `Appearance settings`
      */
    ["com.BrightLoop.appearanceSettings.title"](): string;
    /**
      * `Use transparency effect on the sidebar.`
      */
    ["com.BrightLoop.appearanceSettings.translucentUI.description"](): string;
    /**
      * `Translucent UI on the sidebar`
      */
    ["com.BrightLoop.appearanceSettings.translucentUI.title"](): string;
    /**
      * `Your current email is {{email}}. We'll send a temporary verification link to this email.`
      */
    ["com.BrightLoop.auth.change.email.message"](options: {
        readonly email: string;
    }): string;
    /**
      * `Please enter your new email address below. We will send a verification link to this email address to complete the process.`
      */
    ["com.BrightLoop.auth.change.email.page.subtitle"](): string;
    /**
      * `Congratulations! You have successfully updated the email address associated with your BrightLoop Cloud account.`
      */
    ["com.BrightLoop.auth.change.email.page.success.subtitle"](): string;
    /**
      * `Email address updated!`
      */
    ["com.BrightLoop.auth.change.email.page.success.title"](): string;
    /**
      * `Change email address`
      */
    ["com.BrightLoop.auth.change.email.page.title"](): string;
    /**
      * `Forgot password`
      */
    ["com.BrightLoop.auth.forget"](): string;
    /**
      * `Later`
      */
    ["com.BrightLoop.auth.later"](): string;
    /**
      * `Open BrightLoop`
      */
    ["com.BrightLoop.auth.open.BrightLoop"](): string;
    /**
      * `Download app`
      */
    ["com.BrightLoop.auth.open.BrightLoop.download-app"](): string;
    /**
      * `Try again`
      */
    ["com.BrightLoop.auth.open.BrightLoop.try-again"](): string;
    /**
      * `Still have problems?`
      */
    ["com.BrightLoop.auth.open.BrightLoop.still-have-problems"](): string;
    /**
      * `Continue with Browser`
      */
    ["com.BrightLoop.auth.open.BrightLoop.continue-with-browser"](): string;
    /**
      * `Download Latest Client`
      */
    ["com.BrightLoop.auth.open.BrightLoop.download-latest-client"](): string;
    /**
      * `Open here instead`
      */
    ["com.BrightLoop.auth.open.BrightLoop.doc.open-here"](): string;
    /**
      * `Edit settings`
      */
    ["com.BrightLoop.auth.open.BrightLoop.doc.edit-settings"](): string;
    /**
      * `Requires BrightLoop desktop app version 0.18 or later.`
      */
    ["com.BrightLoop.auth.open.BrightLoop.doc.footer-text"](): string;
    /**
      * `Please set a password of {{min}}-{{max}} characters with both letters and numbers to continue signing up with `
      */
    ["com.BrightLoop.auth.page.sent.email.subtitle"](options: Readonly<{
        min: string;
        max: string;
    }>): string;
    /**
      * `Welcome to BrightLoop Cloud, you are almost there!`
      */
    ["com.BrightLoop.auth.page.sent.email.title"](): string;
    /**
      * `Password`
      */
    ["com.BrightLoop.auth.password"](): string;
    /**
      * `Invalid password`
      */
    ["com.BrightLoop.auth.password.error"](): string;
    /**
      * `Set password failed`
      */
    ["com.BrightLoop.auth.password.set-failed"](): string;
    /**
      * `Reset password`
      */
    ["com.BrightLoop.auth.reset.password"](): string;
    /**
      * `You will receive an email with a link to reset your password. Please check your inbox.`
      */
    ["com.BrightLoop.auth.reset.password.message"](): string;
    /**
      * `Password reset successful`
      */
    ["com.BrightLoop.auth.reset.password.page.success"](): string;
    /**
      * `Reset your BrightLoop Cloud password`
      */
    ["com.BrightLoop.auth.reset.password.page.title"](): string;
    /**
      * `Send reset link`
      */
    ["com.BrightLoop.auth.send.reset.password.link"](): string;
    /**
      * `Send set link`
      */
    ["com.BrightLoop.auth.send.set.password.link"](): string;
    /**
      * `Send verification link`
      */
    ["com.BrightLoop.auth.send.verify.email.hint"](): string;
    /**
      * `Verification code`
      */
    ["com.BrightLoop.auth.sign.auth.code"](): string;
    /**
      * `Invalid verification code`
      */
    ["com.BrightLoop.auth.sign.auth.code.invalid"](): string;
    /**
      * `Continue with code`
      */
    ["com.BrightLoop.auth.sign.auth.code.continue"](): string;
    /**
      * `Resend code`
      */
    ["com.BrightLoop.auth.sign.auth.code.resend"](): string;
    /**
      * `Resend in {{second}}s`
      */
    ["com.BrightLoop.auth.sign.auth.code.resend.hint"](options: {
        readonly second: string;
    }): string;
    /**
      * `Sent`
      */
    ["com.BrightLoop.auth.sent"](): string;
    /**
      * `The verification link failed to be sent, please try again later.`
      */
    ["com.BrightLoop.auth.sent.change.email.fail"](): string;
    /**
      * `Verification link has been sent.`
      */
    ["com.BrightLoop.auth.sent.change.email.hint"](): string;
    /**
      * `Reset password link has been sent.`
      */
    ["com.BrightLoop.auth.sent.change.password.hint"](): string;
    /**
      * `Your password has been updated! You can sign in BrightLoop Cloud with new password!`
      */
    ["com.BrightLoop.auth.sent.reset.password.success.message"](): string;
    /**
      * `Set password link has been sent.`
      */
    ["com.BrightLoop.auth.sent.set.password.hint"](): string;
    /**
      * `Your password has saved! You can sign in BrightLoop Cloud with email and password!`
      */
    ["com.BrightLoop.auth.sent.set.password.success.message"](): string;
    /**
      * `Verification link has been sent.`
      */
    ["com.BrightLoop.auth.sent.verify.email.hint"](): string;
    /**
      * `Save Email`
      */
    ["com.BrightLoop.auth.set.email.save"](): string;
    /**
      * `Set password`
      */
    ["com.BrightLoop.auth.set.password"](): string;
    /**
      * `Please set a password of {{min}}-{{max}} characters with both letters and numbers to continue signing up with `
      */
    ["com.BrightLoop.auth.set.password.message"](options: Readonly<{
        min: string;
        max: string;
    }>): string;
    /**
      * `Maximum {{max}} characters`
      */
    ["com.BrightLoop.auth.set.password.message.maxlength"](options: {
        readonly max: string;
    }): string;
    /**
      * `Minimum {{min}} characters`
      */
    ["com.BrightLoop.auth.set.password.message.minlength"](options: {
        readonly min: string;
    }): string;
    /**
      * `Password set successful`
      */
    ["com.BrightLoop.auth.set.password.page.success"](): string;
    /**
      * `Set your BrightLoop Cloud password`
      */
    ["com.BrightLoop.auth.set.password.page.title"](): string;
    /**
      * `Set a password at least {{min}} letters long`
      */
    ["com.BrightLoop.auth.set.password.placeholder"](options: {
        readonly min: string;
    }): string;
    /**
      * `Confirm password`
      */
    ["com.BrightLoop.auth.set.password.placeholder.confirm"](): string;
    /**
      * `Save password`
      */
    ["com.BrightLoop.auth.set.password.save"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.auth.sign-out.confirm-modal.cancel"](): string;
    /**
      * `Sign Out`
      */
    ["com.BrightLoop.auth.sign-out.confirm-modal.confirm"](): string;
    /**
      * `After signing out, the Cloud Workspaces associated with this account will be removed from the current device, and signing in again will add them back.`
      */
    ["com.BrightLoop.auth.sign-out.confirm-modal.description"](): string;
    /**
      * `Sign out?`
      */
    ["com.BrightLoop.auth.sign-out.confirm-modal.title"](): string;
    /**
      * `If you haven't received the email, please check your spam folder.`
      */
    ["com.BrightLoop.auth.sign.auth.code.message"](): string;
    /**
      * `Sign in with magic link`
      */
    ["com.BrightLoop.auth.sign.auth.code.send-email.sign-in"](): string;
    /**
      * `Terms of conditions`
      */
    ["com.BrightLoop.auth.sign.condition"](): string;
    /**
      * `Continue with email`
      */
    ["com.BrightLoop.auth.sign.email.continue"](): string;
    /**
      * `Invalid email`
      */
    ["com.BrightLoop.auth.sign.email.error"](): string;
    /**
      * `Enter your email address`
      */
    ["com.BrightLoop.auth.sign.email.placeholder"](): string;
    /**
      * `Sign in`
      */
    ["com.BrightLoop.auth.sign.in"](): string;
    /**
      * `Confirm your email`
      */
    ["com.BrightLoop.auth.sign.in.sent.email.subtitle"](): string;
    /**
      * `Self-Hosted`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted.title"](): string;
    /**
      * `Connect to a Self-Hosted Instance`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted"](): string;
    /**
      * `Server URL`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted.baseurl"](): string;
    /**
      * `Connect`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted.connect-button"](): string;
    /**
      * `Unable to connect to the server.`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted.error"](): string;
    /**
      * `Privacy policy`
      */
    ["com.BrightLoop.auth.sign.policy"](): string;
    /**
      * `Sign up`
      */
    ["com.BrightLoop.auth.sign.up"](): string;
    /**
      * `Create your account`
      */
    ["com.BrightLoop.auth.sign.up.sent.email.subtitle"](): string;
    /**
      * `The app will automatically open or redirect to the web version. If you encounter any issues, you can also click the button below to manually open the BrightLoop app.`
      */
    ["com.BrightLoop.auth.sign.up.success.subtitle"](): string;
    /**
      * `Your account has been created and you're now signed in!`
      */
    ["com.BrightLoop.auth.sign.up.success.title"](): string;
    /**
      * `You have successfully signed in. The app will automatically open or redirect to the web version. if you encounter any issues, you can also click the button below to  manually open the BrightLoop app.`
      */
    ["com.BrightLoop.auth.signed.success.subtitle"](): string;
    /**
      * `You're almost there!`
      */
    ["com.BrightLoop.auth.signed.success.title"](): string;
    /**
      * `Server error, please try again later.`
      */
    ["com.BrightLoop.auth.toast.message.failed"](): string;
    /**
      * `You have been signed in, start to sync your data with BrightLoop Cloud!`
      */
    ["com.BrightLoop.auth.toast.message.signed-in"](): string;
    /**
      * `Unable to sign in`
      */
    ["com.BrightLoop.auth.toast.title.failed"](): string;
    /**
      * `Signed in`
      */
    ["com.BrightLoop.auth.toast.title.signed-in"](): string;
    /**
      * `Your current email is {{email}}. We'll send a temporary verification link to this email.`
      */
    ["com.BrightLoop.auth.verify.email.message"](options: {
        readonly email: string;
    }): string;
    /**
      * `Back`
      */
    ["com.BrightLoop.backButton"](): string;
    /**
      * `Your local data is stored in the browser and may be lost. Don't risk it - enable cloud now!`
      */
    ["com.BrightLoop.banner.local-warning"](): string;
    /**
      * `BrightLoop Cloud`
      */
    ["com.BrightLoop.brand.BrightLoopCloud"](): string;
    /**
      * `Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec`
      */
    ["com.BrightLoop.calendar-date-picker.month-names"](): string;
    /**
      * `Today`
      */
    ["com.BrightLoop.calendar-date-picker.today"](): string;
    /**
      * `Su,Mo,Tu,We,Th,Fr,Sa`
      */
    ["com.BrightLoop.calendar-date-picker.week-days"](): string;
    /**
      * `Host by BrightLoop Workspace, Save, sync, and backup all your data.`
      */
    ["com.BrightLoop.cloud-scroll-tip.caption"](): string;
    /**
      * `BrightLoop Cloud`
      */
    ["com.BrightLoop.cloud-scroll-tip.title"](): string;
    /**
      * `Collections`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.collections"](): string;
    /**
      * `Create`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.creation"](): string;
    /**
      * `Edgeless`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.edgeless"](): string;
    /**
      * `General`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.general"](): string;
    /**
      * `Help`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.help"](): string;
    /**
      * `Layout controls`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.layout"](): string;
    /**
      * `Navigation`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.navigation"](): string;
    /**
      * `Docs`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.pages"](): string;
    /**
      * `Recent`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.recent"](): string;
    /**
      * `Settings`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.settings"](): string;
    /**
      * `Tags`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.tags"](): string;
    /**
      * `Updates`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.updates"](): string;
    /**
      * `Edgeless commands`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.editor.edgeless"](): string;
    /**
      * `Insert object`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.editor.insert-object"](): string;
    /**
      * `Doc Commands`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.editor.page"](): string;
    /**
      * `Results`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.results"](): string;
    /**
      * `Change client border style to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.client-border-style.to"](): string;
    /**
      * `Change colour mode to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.color-mode.to"](): string;
    /**
      * `Contact us`
      */
    ["com.BrightLoop.cmdk.BrightLoop.contact-us"](): string;
    /**
      * `Create "{{keyWord}}" doc and insert`
      */
    ["com.BrightLoop.cmdk.BrightLoop.create-new-doc-and-insert"](options: {
        readonly keyWord: string;
    }): string;
    /**
      * `New "{{keyWord}}" edgeless`
      */
    ["com.BrightLoop.cmdk.BrightLoop.create-new-edgeless-as"](options: {
        readonly keyWord: string;
    }): string;
    /**
      * `New "{{keyWord}}" page`
      */
    ["com.BrightLoop.cmdk.BrightLoop.create-new-page-as"](options: {
        readonly keyWord: string;
    }): string;
    /**
      * `Change display language to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.display-language.to"](): string;
    /**
      * `Add to favourites`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.add-to-favourites"](): string;
    /**
      * `Start presentation`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.edgeless.presentation-start"](): string;
    /**
      * `Remove from favourites`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.remove-from-favourites"](): string;
    /**
      * `Restore from trash`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.restore-from-trash"](): string;
    /**
      * `Reveal doc history modal`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.reveal-page-history-modal"](): string;
    /**
      * `This doc has been moved to the trash, you can either restore or permanently delete it.`
      */
    ["com.BrightLoop.cmdk.BrightLoop.editor.trash-footer-hint"](): string;
    /**
      * `Change font style to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.font-style.to"](): string;
    /**
      * `Change full width layout to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.full-width-layout.to"](): string;
    /**
      * `Change default width for new pages in to standard`
      */
    ["com.BrightLoop.cmdk.BrightLoop.default-page-width-layout.standard"](): string;
    /**
      * `Change default width for new pages in to full width`
      */
    ["com.BrightLoop.cmdk.BrightLoop.default-page-width-layout.full-width"](): string;
    /**
      * `Change current page width to standard`
      */
    ["com.BrightLoop.cmdk.BrightLoop.current-page-width-layout.standard"](): string;
    /**
      * `Change current page width to full width`
      */
    ["com.BrightLoop.cmdk.BrightLoop.current-page-width-layout.full-width"](): string;
    /**
      * `Getting started`
      */
    ["com.BrightLoop.cmdk.BrightLoop.getting-started"](): string;
    /**
      * `Import workspace`
      */
    ["com.BrightLoop.cmdk.BrightLoop.import-workspace"](): string;
    /**
      * `Insert this link to the current doc`
      */
    ["com.BrightLoop.cmdk.BrightLoop.insert-link"](): string;
    /**
      * `Collapse left sidebar`
      */
    ["com.BrightLoop.cmdk.BrightLoop.left-sidebar.collapse"](): string;
    /**
      * `Expand left sidebar`
      */
    ["com.BrightLoop.cmdk.BrightLoop.left-sidebar.expand"](): string;
    /**
      * `Go to all docs`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.goto-all-pages"](): string;
    /**
      * `Go to edgeless list`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.goto-edgeless-list"](): string;
    /**
      * `Go to page list`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.goto-page-list"](): string;
    /**
      * `Go to trash`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.goto-trash"](): string;
    /**
      * `Go to workspace`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.goto-workspace"](): string;
    /**
      * `Go to account settings`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.open-account-settings"](): string;
    /**
      * `Go to Settings`
      */
    ["com.BrightLoop.cmdk.BrightLoop.navigation.open-settings"](): string;
    /**
      * `New edgeless`
      */
    ["com.BrightLoop.cmdk.BrightLoop.new-edgeless-page"](): string;
    /**
      * `New page`
      */
    ["com.BrightLoop.cmdk.BrightLoop.new-page"](): string;
    /**
      * `New workspace`
      */
    ["com.BrightLoop.cmdk.BrightLoop.new-workspace"](): string;
    /**
      * `Change noise background on the sidebar to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.noise-background-on-the-sidebar.to"](): string;
    /**
      * `Restart to upgrade`
      */
    ["com.BrightLoop.cmdk.BrightLoop.restart-to-upgrade"](): string;
    /**
      * `OFF`
      */
    ["com.BrightLoop.cmdk.BrightLoop.switch-state.off"](): string;
    /**
      * `ON`
      */
    ["com.BrightLoop.cmdk.BrightLoop.switch-state.on"](): string;
    /**
      * `Change translucent UI on the sidebar to`
      */
    ["com.BrightLoop.cmdk.BrightLoop.translucent-ui-on-the-sidebar.to"](): string;
    /**
      * `What's new`
      */
    ["com.BrightLoop.cmdk.BrightLoop.whats-new"](): string;
    /**
      * `Search docs or paste link...`
      */
    ["com.BrightLoop.cmdk.docs.placeholder"](): string;
    /**
      * `Insert links`
      */
    ["com.BrightLoop.cmdk.insert-links"](): string;
    /**
      * `No results found`
      */
    ["com.BrightLoop.cmdk.no-results"](): string;
    /**
      * `No results found for`
      */
    ["com.BrightLoop.cmdk.no-results-for"](): string;
    /**
      * `Type a command or search anything...`
      */
    ["com.BrightLoop.cmdk.placeholder"](): string;
    /**
      * `Switch to $t(com.BrightLoop.edgelessMode)`
      */
    ["com.BrightLoop.cmdk.switch-to-edgeless"](): string;
    /**
      * `Switch to $t(com.BrightLoop.pageMode)`
      */
    ["com.BrightLoop.cmdk.switch-to-page"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.collection-bar.action.tooltip.delete"](): string;
    /**
      * `Edit`
      */
    ["com.BrightLoop.collection-bar.action.tooltip.edit"](): string;
    /**
      * `Pin to sidebar`
      */
    ["com.BrightLoop.collection-bar.action.tooltip.pin"](): string;
    /**
      * `Unpin`
      */
    ["com.BrightLoop.collection-bar.action.tooltip.unpin"](): string;
    /**
      * `Do you want to add a document to the current collection? If it is filtered based on rules, this will add a set of included rules.`
      */
    ["com.BrightLoop.collection.add-doc.confirm.description"](): string;
    /**
      * `Add new doc to this collection`
      */
    ["com.BrightLoop.collection.add-doc.confirm.title"](): string;
    /**
      * `Doc already exists`
      */
    ["com.BrightLoop.collection.addPage.alreadyExists"](): string;
    /**
      * `Added successfully`
      */
    ["com.BrightLoop.collection.addPage.success"](): string;
    /**
      * `Add docs`
      */
    ["com.BrightLoop.collection.addPages"](): string;
    /**
      * `Add rules`
      */
    ["com.BrightLoop.collection.addRules"](): string;
    /**
      * `All collections`
      */
    ["com.BrightLoop.collection.allCollections"](): string;
    /**
      * `Empty collection`
      */
    ["com.BrightLoop.collection.emptyCollection"](): string;
    /**
      * `Collection is a smart folder where you can manually add docs or automatically add docs through rules.`
      */
    ["com.BrightLoop.collection.emptyCollectionDescription"](): string;
    /**
      * `HELP INFO`
      */
    ["com.BrightLoop.collection.helpInfo"](): string;
    /**
      * `Edit collection`
      */
    ["com.BrightLoop.collection.menu.edit"](): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.collection.menu.rename"](): string;
    /**
      * `Removed successfully`
      */
    ["com.BrightLoop.collection.removePage.success"](): string;
    /**
      * `No collections`
      */
    ["com.BrightLoop.collections.empty.message"](): string;
    /**
      * `New collection`
      */
    ["com.BrightLoop.collections.empty.new-collection-button"](): string;
    /**
      * `Collections`
      */
    ["com.BrightLoop.collections.header"](): string;
    /**
      * `Couldn't copy image`
      */
    ["com.BrightLoop.copy.asImage.notAvailable.title"](): string;
    /**
      * `The 'Copy as image' feature is only available on our desktop app. Please download and install the client to access this feature.`
      */
    ["com.BrightLoop.copy.asImage.notAvailable.message"](): string;
    /**
      * `Download Client`
      */
    ["com.BrightLoop.copy.asImage.notAvailable.action"](): string;
    /**
      * `Image copied`
      */
    ["com.BrightLoop.copy.asImage.success"](): string;
    /**
      * `Image copy failed`
      */
    ["com.BrightLoop.copy.asImage.failed"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.confirmModal.button.cancel"](): string;
    /**
      * `Ok`
      */
    ["com.BrightLoop.confirmModal.button.ok"](): string;
    /**
      * `Current year`
      */
    ["com.BrightLoop.currentYear"](): string;
    /**
      * `Deleting {{count}} tags cannot be undone, please proceed with caution.`
      */
    ["com.BrightLoop.delete-tags.confirm.multi-tag-description"](options: {
        readonly count: string;
    }): string;
    /**
      * `Delete tag?`
      */
    ["com.BrightLoop.delete-tags.confirm.title"](): string;
    /**
      * `{{count}} tag deleted`
    
      * - com.BrightLoop.delete-tags.count_one: `{{count}} tag deleted`
    
      * - com.BrightLoop.delete-tags.count_other: `{{count}} tags deleted`
      */
    ["com.BrightLoop.delete-tags.count"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `{{count}} tag deleted`
      */
    ["com.BrightLoop.delete-tags.count_one"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `{{count}} tags deleted`
      */
    ["com.BrightLoop.delete-tags.count_other"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `Delete workspace from this device and optionally delete all data.`
      */
    ["com.BrightLoop.deleteLeaveWorkspace.description"](): string;
    /**
      * `Leave workspace`
      */
    ["com.BrightLoop.deleteLeaveWorkspace.leave"](): string;
    /**
      * `After you leave, you will not be able to access content within this workspace.`
      */
    ["com.BrightLoop.deleteLeaveWorkspace.leaveDescription"](): string;
    /**
      * `Docs`
      */
    ["com.BrightLoop.docs.header"](): string;
    /**
      * `Draw with a blank whiteboard`
      */
    ["com.BrightLoop.draw_with_a_blank_whiteboard"](): string;
    /**
      * `Earlier`
      */
    ["com.BrightLoop.earlier"](): string;
    /**
      * `Edgeless mode`
      */
    ["com.BrightLoop.edgelessMode"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.editCollection.button.cancel"](): string;
    /**
      * `Create`
      */
    ["com.BrightLoop.editCollection.button.create"](): string;
    /**
      * `Create collection`
      */
    ["com.BrightLoop.editCollection.createCollection"](): string;
    /**
      * `Filters`
      */
    ["com.BrightLoop.editCollection.filters"](): string;
    /**
      * `Docs`
      */
    ["com.BrightLoop.editCollection.pages"](): string;
    /**
      * `Clear selected`
      */
    ["com.BrightLoop.editCollection.pages.clear"](): string;
    /**
      * `Rename collection`
      */
    ["com.BrightLoop.editCollection.renameCollection"](): string;
    /**
      * `Rules`
      */
    ["com.BrightLoop.editCollection.rules"](): string;
    /**
      * `No results`
      */
    ["com.BrightLoop.editCollection.rules.empty.noResults"](): string;
    /**
      * `No docs meet the filtering rules`
      */
    ["com.BrightLoop.editCollection.rules.empty.noResults.tips"](): string;
    /**
      * `No rules`
      */
    ["com.BrightLoop.editCollection.rules.empty.noRules"](): string;
    /**
      * `Add selected doc`
      */
    ["com.BrightLoop.editCollection.rules.include.add"](): string;
    /**
      * `is`
      */
    ["com.BrightLoop.editCollection.rules.include.is"](): string;
    /**
      * `Doc`
      */
    ["com.BrightLoop.editCollection.rules.include.page"](): string;
    /**
      * `â€œSelected docsâ€ refers to manually adding docs rather than automatically adding them through rule matching. You can manually add docs through the â€œAdd selected docsâ€ option or by dragging and dropping.`
      */
    ["com.BrightLoop.editCollection.rules.include.tips"](): string;
    /**
      * `What is "Selected docs"ï¼Ÿ`
      */
    ["com.BrightLoop.editCollection.rules.include.tipsTitle"](): string;
    /**
      * `Selected docs`
      */
    ["com.BrightLoop.editCollection.rules.include.title"](): string;
    /**
      * `Preview`
      */
    ["com.BrightLoop.editCollection.rules.preview"](): string;
    /**
      * `Reset`
      */
    ["com.BrightLoop.editCollection.rules.reset"](): string;
    /**
      * `automatically`
      */
    ["com.BrightLoop.editCollection.rules.tips.highlight"](): string;
    /**
      * `Save`
      */
    ["com.BrightLoop.editCollection.save"](): string;
    /**
      * `Save as new collection`
      */
    ["com.BrightLoop.editCollection.saveCollection"](): string;
    /**
      * `Search doc...`
      */
    ["com.BrightLoop.editCollection.search.placeholder"](): string;
    /**
      * `Untitled collection`
      */
    ["com.BrightLoop.editCollection.untitledCollection"](): string;
    /**
      * `Update collection`
      */
    ["com.BrightLoop.editCollection.updateCollection"](): string;
    /**
      * `Collection is a smart folder where you can manually add docs or automatically add docs through rules.`
      */
    ["com.BrightLoop.editCollectionName.createTips"](): string;
    /**
      * `Name`
      */
    ["com.BrightLoop.editCollectionName.name"](): string;
    /**
      * `Collection name`
      */
    ["com.BrightLoop.editCollectionName.name.placeholder"](): string;
    /**
      * `Default to Edgeless mode`
      */
    ["com.BrightLoop.editorDefaultMode.edgeless"](): string;
    /**
      * `Default to Page mode`
      */
    ["com.BrightLoop.editorDefaultMode.page"](): string;
    /**
      * `Add docs`
      */
    ["com.BrightLoop.empty.collection-detail.action.add-doc"](): string;
    /**
      * `Add rules`
      */
    ["com.BrightLoop.empty.collection-detail.action.add-rule"](): string;
    /**
      * `Collection is a smart folder where you can manually add docs or automatically add docs through rules.`
      */
    ["com.BrightLoop.empty.collection-detail.description"](): string;
    /**
      * `Empty collection`
      */
    ["com.BrightLoop.empty.collection-detail.title"](): string;
    /**
      * `Add collection`
      */
    ["com.BrightLoop.empty.collections.action.new-collection"](): string;
    /**
      * `Create your first collection here.`
      */
    ["com.BrightLoop.empty.collections.description"](): string;
    /**
      * `Collection management`
      */
    ["com.BrightLoop.empty.collections.title"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.empty.docs.action.new-doc"](): string;
    /**
      * `Create your first doc here.`
      */
    ["com.BrightLoop.empty.docs.all-description"](): string;
    /**
      * `Docs management`
      */
    ["com.BrightLoop.empty.docs.title"](): string;
    /**
      * `Deleted docs will appear here.`
      */
    ["com.BrightLoop.empty.docs.trash-description"](): string;
    /**
      * `Create a new tag for your documents.`
      */
    ["com.BrightLoop.empty.tags.description"](): string;
    /**
      * `Tag management`
      */
    ["com.BrightLoop.empty.tags.title"](): string;
    /**
      * `There's no doc here yet`
      */
    ["com.BrightLoop.emptyDesc"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.enableBrightLoopCloudModal.button.cancel"](): string;
    /**
      * `Enable Cloud for {{workspaceName}}`
      */
    ["com.BrightLoop.enableBrightLoopCloudModal.custom-server.title"](options: {
        readonly workspaceName: string;
    }): string;
    /**
      * `Choose an instance.`
      */
    ["com.BrightLoop.enableBrightLoopCloudModal.custom-server.description"](): string;
    /**
      * `Enable Cloud`
      */
    ["com.BrightLoop.enableBrightLoopCloudModal.custom-server.enable"](): string;
    /**
      * `Hide error`
      */
    ["com.BrightLoop.error.hide-error"](): string;
    /**
      * `Doc content is missing`
      */
    ["com.BrightLoop.error.no-page-root.title"](): string;
    /**
      * `It takes longer to load the doc content.`
      */
    ["com.BrightLoop.error.loading-timeout-error"](): string;
    /**
      * `Refetch`
      */
    ["com.BrightLoop.error.refetch"](): string;
    /**
      * `Reload Workspace`
      */
    ["com.BrightLoop.error.reload"](): string;
    /**
      * `Refresh`
      */
    ["com.BrightLoop.error.retry"](): string;
    /**
      * `Something is wrong...`
      */
    ["com.BrightLoop.error.unexpected-error.title"](): string;
    /**
      * `Please request a new reset password link.`
      */
    ["com.BrightLoop.expired.page.subtitle"](): string;
    /**
      * `Please request a new link.`
      */
    ["com.BrightLoop.expired.page.new-subtitle"](): string;
    /**
      * `This link has expired...`
      */
    ["com.BrightLoop.expired.page.title"](): string;
    /**
      * `Please try it again later.`
      */
    ["com.BrightLoop.export.error.message"](): string;
    /**
      * `Export failed due to an unexpected error`
      */
    ["com.BrightLoop.export.error.title"](): string;
    /**
      * `Print`
      */
    ["com.BrightLoop.export.print"](): string;
    /**
      * `Please open the download folder to check.`
      */
    ["com.BrightLoop.export.success.message"](): string;
    /**
      * `Exported successfully`
      */
    ["com.BrightLoop.export.success.title"](): string;
    /**
      * `Add to favourites`
      */
    ["com.BrightLoop.favoritePageOperation.add"](): string;
    /**
      * `Remove from favourites`
      */
    ["com.BrightLoop.favoritePageOperation.remove"](): string;
    /**
      * `Filter`
      */
    ["com.BrightLoop.filter"](): string;
    /**
      * `after`
      */
    ["com.BrightLoop.filter.after"](): string;
    /**
      * `before`
      */
    ["com.BrightLoop.filter.before"](): string;
    /**
      * `contains all`
      */
    ["com.BrightLoop.filter.contains all"](): string;
    /**
      * `contains one of`
      */
    ["com.BrightLoop.filter.contains one of"](): string;
    /**
      * `does not contains all`
      */
    ["com.BrightLoop.filter.does not contains all"](): string;
    /**
      * `does not contains one of`
      */
    ["com.BrightLoop.filter.does not contains one of"](): string;
    /**
      * `Empty`
      */
    ["com.BrightLoop.filter.empty-tag"](): string;
    /**
      * `false`
      */
    ["com.BrightLoop.filter.false"](): string;
    /**
      * `is`
      */
    ["com.BrightLoop.filter.is"](): string;
    /**
      * `is empty`
      */
    ["com.BrightLoop.filter.is empty"](): string;
    /**
      * `is not empty`
      */
    ["com.BrightLoop.filter.is not empty"](): string;
    /**
      * `Favourited`
      */
    ["com.BrightLoop.filter.is-favourited"](): string;
    /**
      * `Shared`
      */
    ["com.BrightLoop.filter.is-public"](): string;
    /**
      * `last`
      */
    ["com.BrightLoop.filter.last"](): string;
    /**
      * `Save view`
      */
    ["com.BrightLoop.filter.save-view"](): string;
    /**
      * `true`
      */
    ["com.BrightLoop.filter.true"](): string;
    /**
      * `Add filter`
      */
    ["com.BrightLoop.filterList.button.add"](): string;
    /**
      * `View in Page mode`
      */
    ["com.BrightLoop.header.mode-switch.page"](): string;
    /**
      * `View in Edgeless Canvas`
      */
    ["com.BrightLoop.header.mode-switch.edgeless"](): string;
    /**
      * `Add tag`
      */
    ["com.BrightLoop.header.option.add-tag"](): string;
    /**
      * `Duplicate`
      */
    ["com.BrightLoop.header.option.duplicate"](): string;
    /**
      * `Open in desktop app`
      */
    ["com.BrightLoop.header.option.open-in-desktop"](): string;
    /**
      * `View all frames`
      */
    ["com.BrightLoop.header.option.view-frame"](): string;
    /**
      * `View table of contents`
      */
    ["com.BrightLoop.header.option.view-toc"](): string;
    /**
      * `Table of contents`
      */
    ["com.BrightLoop.header.menu.toc"](): string;
    /**
      * `Contact us`
      */
    ["com.BrightLoop.helpIsland.contactUs"](): string;
    /**
      * `Getting started`
      */
    ["com.BrightLoop.helpIsland.gettingStarted"](): string;
    /**
      * `Help and feedback`
      */
    ["com.BrightLoop.helpIsland.helpAndFeedback"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.history-vision.tips-modal.cancel"](): string;
    /**
      * `Enable BrightLoop Cloud`
      */
    ["com.BrightLoop.history-vision.tips-modal.confirm"](): string;
    /**
      * `The current workspace is a local workspace, and we do not support version history for it at the moment. You can enable BrightLoop Cloud. This will sync the workspace with the Cloud, allowing you to use this feature.`
      */
    ["com.BrightLoop.history-vision.tips-modal.description"](): string;
    /**
      * `History vision needs BrightLoop Cloud`
      */
    ["com.BrightLoop.history-vision.tips-modal.title"](): string;
    /**
      * `Back to doc`
      */
    ["com.BrightLoop.history.back-to-page"](): string;
    /**
      * `You are about to restore the current version of the doc to the latest version available. This action will overwrite any changes made prior to the latest version.`
      */
    ["com.BrightLoop.history.confirm-restore-modal.hint"](): string;
    /**
      * `Load more`
      */
    ["com.BrightLoop.history.confirm-restore-modal.load-more"](): string;
    /**
      * `LIMITED DOC HISTORY`
      */
    ["com.BrightLoop.history.confirm-restore-modal.plan-prompt.limited-title"](): string;
    /**
      * `HELP INFO`
      */
    ["com.BrightLoop.history.confirm-restore-modal.plan-prompt.title"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.history.confirm-restore-modal.pro-plan-prompt.upgrade"](): string;
    /**
      * `Restore`
      */
    ["com.BrightLoop.history.confirm-restore-modal.restore"](): string;
    /**
      * `This document is such a spring chicken, it hasn't sprouted a single historical sprig yet!`
      */
    ["com.BrightLoop.history.empty-prompt.description"](): string;
    /**
      * `Empty`
      */
    ["com.BrightLoop.history.empty-prompt.title"](): string;
    /**
      * `Restore current version`
      */
    ["com.BrightLoop.history.restore-current-version"](): string;
    /**
      * `Version history`
      */
    ["com.BrightLoop.history.version-history"](): string;
    /**
      * `View history version`
      */
    ["com.BrightLoop.history.view-history-version"](): string;
    /**
      * `Create into a New Workspace`
      */
    ["com.BrightLoop.import-template.dialog.createDocToNewWorkspace"](): string;
    /**
      * `Create doc to "{{workspace}}"`
      */
    ["com.BrightLoop.import-template.dialog.createDocToWorkspace"](options: {
        readonly workspace: string;
    }): string;
    /**
      * `Create doc with "{{templateName}}" template`
      */
    ["com.BrightLoop.import-template.dialog.createDocWithTemplate"](options: {
        readonly templateName: string;
    }): string;
    /**
      * `Failed to import template, please try again.`
      */
    ["com.BrightLoop.import-template.dialog.errorImport"](): string;
    /**
      * `Failed to load template, please try again.`
      */
    ["com.BrightLoop.import-template.dialog.errorLoad"](): string;
    /**
      * `Create into a New Workspace`
      */
    ["com.BrightLoop.import-clipper.dialog.createDocToNewWorkspace"](): string;
    /**
      * `Create doc to "{{workspace}}"`
      */
    ["com.BrightLoop.import-clipper.dialog.createDocToWorkspace"](options: {
        readonly workspace: string;
    }): string;
    /**
      * `Create doc from Web Clipper`
      */
    ["com.BrightLoop.import-clipper.dialog.createDocFromClipper"](): string;
    /**
      * `Failed to import content, please try again.`
      */
    ["com.BrightLoop.import-clipper.dialog.errorImport"](): string;
    /**
      * `Failed to load content, please try again.`
      */
    ["com.BrightLoop.import-clipper.dialog.errorLoad"](): string;
    /**
      * `Support Markdown/Notion`
      */
    ["com.BrightLoop.import_file"](): string;
    /**
      * `BrightLoop workspace data`
      */
    ["com.BrightLoop.import.BrightLoop-workspace-data"](): string;
    /**
      * `HTML`
      */
    ["com.BrightLoop.import.html-files"](): string;
    /**
      * `This is an experimental feature that is not perfect and may cause your data to be missing after import.`
      */
    ["com.BrightLoop.import.html-files.tooltip"](): string;
    /**
      * `Markdown files (.md)`
      */
    ["com.BrightLoop.import.markdown-files"](): string;
    /**
      * `Markdown with media files (.zip)`
      */
    ["com.BrightLoop.import.markdown-with-media-files"](): string;
    /**
      * `Please upload a markdown zip file with attachments, experimental function, there may be data loss.`
      */
    ["com.BrightLoop.import.markdown-with-media-files.tooltip"](): string;
    /**
      * `If you'd like to request support for additional file types, feel free to let us know on`
      */
    ["com.BrightLoop.import.modal.tip"](): string;
    /**
      * `Notion`
      */
    ["com.BrightLoop.import.notion"](): string;
    /**
      * `Import your Notion data. Supported import formats: HTML with subpages.`
      */
    ["com.BrightLoop.import.notion.tooltip"](): string;
    /**
      * `Snapshot`
      */
    ["com.BrightLoop.import.snapshot"](): string;
    /**
      * `Import your BrightLoop workspace and page snapshot file.`
      */
    ["com.BrightLoop.import.snapshot.tooltip"](): string;
    /**
      * `Import failed, please try again.`
      */
    ["com.BrightLoop.import.status.failed.message"](): string;
    /**
      * `No file selected`
      */
    ["com.BrightLoop.import.status.failed.message.no-file-selected"](): string;
    /**
      * `Import failure`
      */
    ["com.BrightLoop.import.status.failed.title"](): string;
    /**
      * `Importing your workspace data, please wait patiently.`
      */
    ["com.BrightLoop.import.status.importing.message"](): string;
    /**
      * `Importing...`
      */
    ["com.BrightLoop.import.status.importing.title"](): string;
    /**
      * `Your document has been imported successfully, thank you for choosing BrightLoop. Any questions please feel free to feedback to us`
      */
    ["com.BrightLoop.import.status.success.message"](): string;
    /**
      * `Import completed`
      */
    ["com.BrightLoop.import.status.success.title"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.inviteModal.button.cancel"](): string;
    /**
      * `Maybe later`
      */
    ["com.BrightLoop.issue-feedback.cancel"](): string;
    /**
      * `Create issue on GitHub`
      */
    ["com.BrightLoop.issue-feedback.confirm"](): string;
    /**
      * `Got feedback? We're all ears! Create an issue on GitHub to let us know your thoughts and suggestions`
      */
    ["com.BrightLoop.issue-feedback.description"](): string;
    /**
      * `Share your feedback on GitHub`
      */
    ["com.BrightLoop.issue-feedback.title"](): string;
    /**
      * `Journals`
      */
    ["com.BrightLoop.journal.app-sidebar-title"](): string;
    /**
      * `{{count}} more articles`
      */
    ["com.BrightLoop.journal.conflict-show-more"](options: {
        readonly count: string;
    }): string;
    /**
      * `Created`
      */
    ["com.BrightLoop.journal.created-today"](): string;
    /**
      * `You haven't created anything yet`
      */
    ["com.BrightLoop.journal.daily-count-created-empty-tips"](): string;
    /**
      * `You haven't updated anything yet`
      */
    ["com.BrightLoop.journal.daily-count-updated-empty-tips"](): string;
    /**
      * `Updated`
      */
    ["com.BrightLoop.journal.updated-today"](): string;
    /**
      * `Just now`
      */
    ["com.BrightLoop.just-now"](): string;
    /**
      * `Append to daily note`
      */
    ["com.BrightLoop.keyboardShortcuts.appendDailyNote"](): string;
    /**
      * `Body text`
      */
    ["com.BrightLoop.keyboardShortcuts.bodyText"](): string;
    /**
      * `Bold`
      */
    ["com.BrightLoop.keyboardShortcuts.bold"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.keyboardShortcuts.cancel"](): string;
    /**
      * `Code block`
      */
    ["com.BrightLoop.keyboardShortcuts.codeBlock"](): string;
    /**
      * `Copy private link`
      */
    ["com.BrightLoop.keyboardShortcuts.copy-private-link"](): string;
    /**
      * `Connector`
      */
    ["com.BrightLoop.keyboardShortcuts.connector"](): string;
    /**
      * `Divider`
      */
    ["com.BrightLoop.keyboardShortcuts.divider"](): string;
    /**
      * `Expand/collapse sidebar`
      */
    ["com.BrightLoop.keyboardShortcuts.expandOrCollapseSidebar"](): string;
    /**
      * `Go back`
      */
    ["com.BrightLoop.keyboardShortcuts.goBack"](): string;
    /**
      * `Go forward`
      */
    ["com.BrightLoop.keyboardShortcuts.goForward"](): string;
    /**
      * `Group`
      */
    ["com.BrightLoop.keyboardShortcuts.group"](): string;
    /**
      * `Group as database`
      */
    ["com.BrightLoop.keyboardShortcuts.groupDatabase"](): string;
    /**
      * `Hand`
      */
    ["com.BrightLoop.keyboardShortcuts.hand"](): string;
    /**
      * `Heading {{number}}`
      */
    ["com.BrightLoop.keyboardShortcuts.heading"](options: {
        readonly number: string;
    }): string;
    /**
      * `Image`
      */
    ["com.BrightLoop.keyboardShortcuts.image"](): string;
    /**
      * `Increase indent`
      */
    ["com.BrightLoop.keyboardShortcuts.increaseIndent"](): string;
    /**
      * `Inline code`
      */
    ["com.BrightLoop.keyboardShortcuts.inlineCode"](): string;
    /**
      * `Italic`
      */
    ["com.BrightLoop.keyboardShortcuts.italic"](): string;
    /**
      * `Hyperlink (with selected text)`
      */
    ["com.BrightLoop.keyboardShortcuts.link"](): string;
    /**
      * `Move down`
      */
    ["com.BrightLoop.keyboardShortcuts.moveDown"](): string;
    /**
      * `Move up`
      */
    ["com.BrightLoop.keyboardShortcuts.moveUp"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.keyboardShortcuts.newPage"](): string;
    /**
      * `Note`
      */
    ["com.BrightLoop.keyboardShortcuts.note"](): string;
    /**
      * `Pen`
      */
    ["com.BrightLoop.keyboardShortcuts.pen"](): string;
    /**
      * `Quick search`
      */
    ["com.BrightLoop.keyboardShortcuts.quickSearch"](): string;
    /**
      * `Redo`
      */
    ["com.BrightLoop.keyboardShortcuts.redo"](): string;
    /**
      * `Reduce indent`
      */
    ["com.BrightLoop.keyboardShortcuts.reduceIndent"](): string;
    /**
      * `Select`
      */
    ["com.BrightLoop.keyboardShortcuts.select"](): string;
    /**
      * `Select all`
      */
    ["com.BrightLoop.keyboardShortcuts.selectAll"](): string;
    /**
      * `Shape`
      */
    ["com.BrightLoop.keyboardShortcuts.shape"](): string;
    /**
      * `Strikethrough`
      */
    ["com.BrightLoop.keyboardShortcuts.strikethrough"](): string;
    /**
      * `Check keyboard shortcuts quickly`
      */
    ["com.BrightLoop.keyboardShortcuts.subtitle"](): string;
    /**
      * `Switch view`
      */
    ["com.BrightLoop.keyboardShortcuts.switch"](): string;
    /**
      * `Text`
      */
    ["com.BrightLoop.keyboardShortcuts.text"](): string;
    /**
      * `Keyboard shortcuts`
      */
    ["com.BrightLoop.keyboardShortcuts.title"](): string;
    /**
      * `Ungroup`
      */
    ["com.BrightLoop.keyboardShortcuts.unGroup"](): string;
    /**
      * `Underline`
      */
    ["com.BrightLoop.keyboardShortcuts.underline"](): string;
    /**
      * `Undo`
      */
    ["com.BrightLoop.keyboardShortcuts.undo"](): string;
    /**
      * `Zoom in`
      */
    ["com.BrightLoop.keyboardShortcuts.zoomIn"](): string;
    /**
      * `Zoom out`
      */
    ["com.BrightLoop.keyboardShortcuts.zoomOut"](): string;
    /**
      * `Zoom to 100%`
      */
    ["com.BrightLoop.keyboardShortcuts.zoomTo100"](): string;
    /**
      * `Zoom to fit`
      */
    ["com.BrightLoop.keyboardShortcuts.zoomToFit"](): string;
    /**
      * `Zoom to selection`
      */
    ["com.BrightLoop.keyboardShortcuts.zoomToSelection"](): string;
    /**
      * `Last 30 days`
      */
    ["com.BrightLoop.last30Days"](): string;
    /**
      * `Last 7 days`
      */
    ["com.BrightLoop.last7Days"](): string;
    /**
      * `Last month`
      */
    ["com.BrightLoop.lastMonth"](): string;
    /**
      * `Last week`
      */
    ["com.BrightLoop.lastWeek"](): string;
    /**
      * `Last year`
      */
    ["com.BrightLoop.lastYear"](): string;
    /**
      * `Loading`
      */
    ["com.BrightLoop.loading"](): string;
    /**
      * `Loading document content, please wait a moment.`
      */
    ["com.BrightLoop.loading.description"](): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.menu.rename"](): string;
    /**
      * `No results found`
      */
    ["com.BrightLoop.mobile.search.empty"](): string;
    /**
      * `App version`
      */
    ["com.BrightLoop.mobile.setting.about.appVersion"](): string;
    /**
      * `Editor version`
      */
    ["com.BrightLoop.mobile.setting.about.editorVersion"](): string;
    /**
      * `About`
      */
    ["com.BrightLoop.mobile.setting.about.title"](): string;
    /**
      * `Font style`
      */
    ["com.BrightLoop.mobile.setting.appearance.font"](): string;
    /**
      * `Display language`
      */
    ["com.BrightLoop.mobile.setting.appearance.language"](): string;
    /**
      * `Color mode`
      */
    ["com.BrightLoop.mobile.setting.appearance.theme"](): string;
    /**
      * `Appearance`
      */
    ["com.BrightLoop.mobile.setting.appearance.title"](): string;
    /**
      * `Settings`
      */
    ["com.BrightLoop.mobile.setting.header-title"](): string;
    /**
      * `Star us on GitHub`
      */
    ["com.BrightLoop.mobile.setting.others.github"](): string;
    /**
      * `Privacy`
      */
    ["com.BrightLoop.mobile.setting.others.privacy"](): string;
    /**
      * `Terms of use`
      */
    ["com.BrightLoop.mobile.setting.others.terms"](): string;
    /**
      * `Privacy & others`
      */
    ["com.BrightLoop.mobile.setting.others.title"](): string;
    /**
      * `Official website`
      */
    ["com.BrightLoop.mobile.setting.others.website"](): string;
    /**
      * `Want to keep data local?`
      */
    ["com.BrightLoop.mobile.sign-in.skip.hint"](): string;
    /**
      * `Start BrightLoop without an account`
      */
    ["com.BrightLoop.mobile.sign-in.skip.link"](): string;
    /**
      * `Older than a month`
      */
    ["com.BrightLoop.moreThan30Days"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.cancel"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.confirm"](): string;
    /**
      * `{{title}} will be moved to trash`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.description"](options: {
        readonly title: string;
    }): string;
    /**
      * `{{ number }} docs will be moved to Trash`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.description.multiple"](options: {
        readonly number: string;
    }): string;
    /**
      * `Delete doc?`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.title"](): string;
    /**
      * `Delete {{ number }} docs?`
      */
    ["com.BrightLoop.moveToTrash.confirmModal.title.multiple"](options: {
        readonly number: string;
    }): string;
    /**
      * `Move to trash`
      */
    ["com.BrightLoop.moveToTrash.title"](): string;
    /**
      * `New tab`
      */
    ["com.BrightLoop.multi-tab.new-tab"](): string;
    /**
      * `Enabling BrightLoop Cloud allows you to synchronise and backup data, as well as support multi-user collaboration and content publishing.`
      */
    ["com.BrightLoop.nameWorkspace.BrightLoop-cloud.description"](): string;
    /**
      * `Sync across devices with BrightLoop Cloud`
      */
    ["com.BrightLoop.nameWorkspace.BrightLoop-cloud.title"](): string;
    /**
      * `If you want the workspace to be stored locally, you can download the desktop client.`
      */
    ["com.BrightLoop.nameWorkspace.BrightLoop-cloud.web-tips"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.nameWorkspace.button.cancel"](): string;
    /**
      * `Create`
      */
    ["com.BrightLoop.nameWorkspace.button.create"](): string;
    /**
      * `Choose a name for your new workspace.`
      */
    ["com.BrightLoop.nameWorkspace.description"](): string;
    /**
      * `My Workspace`
      */
    ["com.BrightLoop.nameWorkspace.placeholder"](): string;
    /**
      * `Workspace Name`
      */
    ["com.BrightLoop.nameWorkspace.subtitle.workspace-name"](): string;
    /**
      * `Workspace Type`
      */
    ["com.BrightLoop.nameWorkspace.subtitle.workspace-type"](): string;
    /**
      * `Name your workspace`
      */
    ["com.BrightLoop.nameWorkspace.title"](): string;
    /**
      * `New page`
      */
    ["com.BrightLoop.new.page-mode"](): string;
    /**
      * `New edgeless`
      */
    ["com.BrightLoop.new_edgeless"](): string;
    /**
      * `Import`
      */
    ["com.BrightLoop.new_import"](): string;
    /**
      * `Next week`
      */
    ["com.BrightLoop.nextWeek"](): string;
    /**
      * `Back home`
      */
    ["com.BrightLoop.notFoundPage.backButton"](): string;
    /**
      * `Page not found`
      */
    ["com.BrightLoop.notFoundPage.title"](): string;
    /**
      * `BrightLoop Community`
      */
    ["com.BrightLoop.other-page.nav.BrightLoop-community"](): string;
    /**
      * `Blog`
      */
    ["com.BrightLoop.other-page.nav.blog"](): string;
    /**
      * `Contact us`
      */
    ["com.BrightLoop.other-page.nav.contact-us"](): string;
    /**
      * `Download app`
      */
    ["com.BrightLoop.other-page.nav.download-app"](): string;
    /**
      * `Official website`
      */
    ["com.BrightLoop.other-page.nav.official-website"](): string;
    /**
      * `Open BrightLoop`
      */
    ["com.BrightLoop.other-page.nav.open-BrightLoop"](): string;
    /**
      * `Add linked doc`
      */
    ["com.BrightLoop.page-operation.add-linked-page"](): string;
    /**
      * `{{ count }} more properties`
      */
    ["com.BrightLoop.page-properties.more-property.more"](options: {
        readonly count: string;
    }): string;
    /**
      * `{{ count }} more property`
      */
    ["com.BrightLoop.page-properties.more-property.one"](options: {
        readonly count: string;
    }): string;
    /**
      * `hide {{ count }} property`
      */
    ["com.BrightLoop.page-properties.hide-property.one"](options: {
        readonly count: string;
    }): string;
    /**
      * `hide {{ count }} properties`
      */
    ["com.BrightLoop.page-properties.hide-property.more"](options: {
        readonly count: string;
    }): string;
    /**
      * `Add property`
      */
    ["com.BrightLoop.page-properties.add-property"](): string;
    /**
      * `Create property`
      */
    ["com.BrightLoop.page-properties.add-property.menu.create"](): string;
    /**
      * `Properties`
      */
    ["com.BrightLoop.page-properties.add-property.menu.header"](): string;
    /**
      * `Config properties`
      */
    ["com.BrightLoop.page-properties.config-properties"](): string;
    /**
      * `Backlinks`
      */
    ["com.BrightLoop.page-properties.backlinks"](): string;
    /**
      * `Type`
      */
    ["com.BrightLoop.page-properties.create-property.menu.header"](): string;
    /**
      * `Added`
      */
    ["com.BrightLoop.page-properties.create-property.added"](): string;
    /**
      * `Icons`
      */
    ["com.BrightLoop.page-properties.icons"](): string;
    /**
      * `Local user`
      */
    ["com.BrightLoop.page-properties.local-user"](): string;
    /**
      * `Outgoing links`
      */
    ["com.BrightLoop.page-properties.outgoing-links"](): string;
    /**
      * `Info`
      */
    ["com.BrightLoop.page-properties.page-info"](): string;
    /**
      * `View Info`
      */
    ["com.BrightLoop.page-properties.page-info.view"](): string;
    /**
      * `No Record`
      */
    ["com.BrightLoop.page-properties.property-user-avatar-no-record"](): string;
    /**
      * `Local User`
      */
    ["com.BrightLoop.page-properties.property-user-local"](): string;
    /**
      * `Empty`
      */
    ["com.BrightLoop.page-properties.property-value-placeholder"](): string;
    /**
      * `Always hide`
      */
    ["com.BrightLoop.page-properties.property.always-hide"](): string;
    /**
      * `Always show`
      */
    ["com.BrightLoop.page-properties.property.always-show"](): string;
    /**
      * `Checkbox`
      */
    ["com.BrightLoop.page-properties.property.checkbox"](): string;
    /**
      * `Created by`
      */
    ["com.BrightLoop.page-properties.property.createdBy"](): string;
    /**
      * `Date`
      */
    ["com.BrightLoop.page-properties.property.date"](): string;
    /**
      * `Hide in view`
      */
    ["com.BrightLoop.page-properties.property.hide-in-view"](): string;
    /**
      * `Hide in view when empty`
      */
    ["com.BrightLoop.page-properties.property.hide-in-view-when-empty"](): string;
    /**
      * `Hide when empty`
      */
    ["com.BrightLoop.page-properties.property.hide-when-empty"](): string;
    /**
      * `Number`
      */
    ["com.BrightLoop.page-properties.property.number"](): string;
    /**
      * `Progress`
      */
    ["com.BrightLoop.page-properties.property.progress"](): string;
    /**
      * `Remove property`
      */
    ["com.BrightLoop.page-properties.property.remove-property"](): string;
    /**
      * `Required`
      */
    ["com.BrightLoop.page-properties.property.required"](): string;
    /**
      * `Show in view`
      */
    ["com.BrightLoop.page-properties.property.show-in-view"](): string;
    /**
      * `Tags`
      */
    ["com.BrightLoop.page-properties.property.tags"](): string;
    /**
      * `Doc mode`
      */
    ["com.BrightLoop.page-properties.property.docPrimaryMode"](): string;
    /**
      * `Text`
      */
    ["com.BrightLoop.page-properties.property.text"](): string;
    /**
      * `Journal`
      */
    ["com.BrightLoop.page-properties.property.journal"](): string;
    /**
      * `Duplicated`
      */
    ["com.BrightLoop.page-properties.property.journal-duplicated"](): string;
    /**
      * `Remove journal mark`
      */
    ["com.BrightLoop.page-properties.property.journal-remove"](): string;
    /**
      * `Last edited by`
      */
    ["com.BrightLoop.page-properties.property.updatedBy"](): string;
    /**
      * `Created`
      */
    ["com.BrightLoop.page-properties.property.createdAt"](): string;
    /**
      * `Updated`
      */
    ["com.BrightLoop.page-properties.property.updatedAt"](): string;
    /**
      * `Edgeless theme`
      */
    ["com.BrightLoop.page-properties.property.edgelessTheme"](): string;
    /**
      * `Page width`
      */
    ["com.BrightLoop.page-properties.property.pageWidth"](): string;
    /**
      * `Template`
      */
    ["com.BrightLoop.page-properties.property.template"](): string;
    /**
      * `Add relevant identifiers or categories to the doc. Useful for organizing content, improving searchability, and grouping related docs together.`
      */
    ["com.BrightLoop.page-properties.property.tags.tooltips"](): string;
    /**
      * `Indicates that this doc is a journal entry or daily note. Facilitates easy capture of ideas, quick logging of thoughts, and ongoing personal reflection.`
      */
    ["com.BrightLoop.page-properties.property.journal.tooltips"](): string;
    /**
      * `Use a checkbox to indicate whether a condition is true or false. Useful for confirming options, toggling features, or tracking task states.`
      */
    ["com.BrightLoop.page-properties.property.checkbox.tooltips"](): string;
    /**
      * `Use a date field to select or display a specific date. Useful for scheduling, setting deadlines, or recording important events.`
      */
    ["com.BrightLoop.page-properties.property.date.tooltips"](): string;
    /**
      * `Upload images to display or manage them. Useful for showcasing visual content, adding illustrations, or organizing a gallery.`
      */
    ["com.BrightLoop.page-properties.property.image.tooltips"](): string;
    /**
      * `Select one or more options. Useful for categorizing items, filtering data, or managing tags.`
      */
    ["com.BrightLoop.page-properties.property.multiSelect.tooltips"](): string;
    /**
      * `Enter a numeric value. Useful for quantities, measurements, or ranking items.`
      */
    ["com.BrightLoop.page-properties.property.number.tooltips"](): string;
    /**
      * `Set a progress value between 0 and 100. Useful for tracking completion status, visualizing progress, or managing goals.`
      */
    ["com.BrightLoop.page-properties.property.progress.tooltips"](): string;
    /**
      * `Choose one option. Useful for selecting a single preference, categorizing items, or making decisions.`
      */
    ["com.BrightLoop.page-properties.property.select.tooltips"](): string;
    /**
      * `Enter a link to websites or BrightLoop docs. Useful for connecting to external resources and referencing internal docs.`
      */
    ["com.BrightLoop.page-properties.property.link.tooltips"](): string;
    /**
      * `Enter text. Useful for descriptions, comments, notes, or any other free-form text input.`
      */
    ["com.BrightLoop.page-properties.property.text.tooltips"](): string;
    /**
      * `Displays the author of the current doc. Useful for tracking doc ownership, accountability, and collaboration.`
      */
    ["com.BrightLoop.page-properties.property.createdBy.tooltips"](): string;
    /**
      * `Displays the last editor of the current doc. Useful for tracking recent changes.`
      */
    ["com.BrightLoop.page-properties.property.updatedBy.tooltips"](): string;
    /**
      * `Record the last modification timestamp. Useful for tracking changes, identifying recent updates, or monitoring content freshness.`
      */
    ["com.BrightLoop.page-properties.property.updatedAt.tooltips"](): string;
    /**
      * `Track when a doc was first created. Useful for maintaining record history, sorting by creation date, or auditing content chronologically.`
      */
    ["com.BrightLoop.page-properties.property.createdAt.tooltips"](): string;
    /**
      * `Select the doc mode from Page Mode, Edgeless Mode, or Auto. Useful for choosing the best display for your content.`
      */
    ["com.BrightLoop.page-properties.property.docPrimaryMode.tooltips"](): string;
    /**
      * `Select the doc theme from Light, Dark, or System. Useful for precise control over content viewing style.`
      */
    ["com.BrightLoop.page-properties.property.edgelessTheme.tooltips"](): string;
    /**
      * `Control the width of this page to fit content display needs.`
      */
    ["com.BrightLoop.page-properties.property.pageWidth.tooltips"](): string;
    /**
      * `Mark this doc as a template, which can be used to create new docs.`
      */
    ["com.BrightLoop.page-properties.property.template.tooltips"](): string;
    /**
      * `Properties`
      */
    ["com.BrightLoop.propertySidebar.property-list.section"](): string;
    /**
      * `Add more properties`
      */
    ["com.BrightLoop.propertySidebar.add-more.section"](): string;
    /**
      * `customize properties`
      */
    ["com.BrightLoop.page-properties.settings.title"](): string;
    /**
      * `Open tag page`
      */
    ["com.BrightLoop.page-properties.tags.open-tags-page"](): string;
    /**
      * `Select tag or create one`
      */
    ["com.BrightLoop.page-properties.tags.selector-header-title"](): string;
    /**
      * `Display`
      */
    ["com.BrightLoop.page.display"](): string;
    /**
      * `Display properties`
      */
    ["com.BrightLoop.page.display.display-properties"](): string;
    /**
      * `Body notes`
      */
    ["com.BrightLoop.page.display.display-properties.body-notes"](): string;
    /**
      * `Grouping`
      */
    ["com.BrightLoop.page.display.grouping"](): string;
    /**
      * `Favourites`
      */
    ["com.BrightLoop.page.display.grouping.group-by-favourites"](): string;
    /**
      * `Tag`
      */
    ["com.BrightLoop.page.display.grouping.group-by-tag"](): string;
    /**
      * `Untagged`
      */
    ["com.BrightLoop.page.display.grouping.group-by-tag.untagged"](): string;
    /**
      * `No grouping`
      */
    ["com.BrightLoop.page.display.grouping.no-grouping"](): string;
    /**
      * `List option`
      */
    ["com.BrightLoop.page.display.list-option"](): string;
    /**
      * `Clear selection`
      */
    ["com.BrightLoop.page.group-header.clear"](): string;
    /**
      * `Favourited`
      */
    ["com.BrightLoop.page.group-header.favourited"](): string;
    /**
      * `Not favourited`
      */
    ["com.BrightLoop.page.group-header.not-favourited"](): string;
    /**
      * `Select all`
      */
    ["com.BrightLoop.page.group-header.select-all"](): string;
    /**
      * `Created by {{name}}`
      */
    ["com.BrightLoop.page.toolbar.created_by"](options: {
        readonly name: string;
    }): string;
    /**
      * `Doc mode`
      */
    ["com.BrightLoop.pageMode"](): string;
    /**
      * `all`
      */
    ["com.BrightLoop.pageMode.all"](): string;
    /**
      * `Edgeless`
      */
    ["com.BrightLoop.pageMode.edgeless"](): string;
    /**
      * `Page`
      */
    ["com.BrightLoop.pageMode.page"](): string;
    /**
      * `Congratulations on your successful purchase of BrightLoop AI! You're now empowered to refine your content, generate images, and craft comprehensive mindmaps directly within BrightLoop AI, dramatically enhancing your productivity.`
      */
    ["com.BrightLoop.payment.ai-upgrade-success-page.text"](): string;
    /**
      * `Purchase successful!`
      */
    ["com.BrightLoop.payment.ai-upgrade-success-page.title"](): string;
    /**
      * `Cancel subscription`
      */
    ["com.BrightLoop.payment.ai.action.cancel.button-label"](): string;
    /**
      * `Keep BrightLoop AI`
      */
    ["com.BrightLoop.payment.ai.action.cancel.confirm.cancel-text"](): string;
    /**
      * `Cancel subscription`
      */
    ["com.BrightLoop.payment.ai.action.cancel.confirm.confirm-text"](): string;
    /**
      * `If you end your subscription now, you can still use BrightLoop AI until the end of this billing period.`
      */
    ["com.BrightLoop.payment.ai.action.cancel.confirm.description"](): string;
    /**
      * `Cancel subscription`
      */
    ["com.BrightLoop.payment.ai.action.cancel.confirm.title"](): string;
    /**
      * `Login`
      */
    ["com.BrightLoop.payment.ai.action.login.button-label"](): string;
    /**
      * `Resume`
      */
    ["com.BrightLoop.payment.ai.action.resume.button-label"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.cancel-text"](): string;
    /**
      * `Confirm`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.confirm-text"](): string;
    /**
      * `Are you sure you want to resume the subscription for BrightLoop AI? This means your payment method will be charged automatically at the end of each billing cycle, starting from the next billing cycle.`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.description"](): string;
    /**
      * `You will be charged in the next billing cycle.`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.notify.msg"](): string;
    /**
      * `Subscription updated`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.notify.title"](): string;
    /**
      * `Resume auto-renewal?`
      */
    ["com.BrightLoop.payment.ai.action.resume.confirm.title"](): string;
    /**
      * `Write with you`
      */
    ["com.BrightLoop.payment.ai.benefit.g1"](): string;
    /**
      * `Create quality content from sentences to articles on topics you need`
      */
    ["com.BrightLoop.payment.ai.benefit.g1-1"](): string;
    /**
      * `Rewrite like the professionals`
      */
    ["com.BrightLoop.payment.ai.benefit.g1-2"](): string;
    /**
      * `Change the tones / fix spelling & grammar`
      */
    ["com.BrightLoop.payment.ai.benefit.g1-3"](): string;
    /**
      * `Draw with you`
      */
    ["com.BrightLoop.payment.ai.benefit.g2"](): string;
    /**
      * `Visualize your mind, magically`
      */
    ["com.BrightLoop.payment.ai.benefit.g2-1"](): string;
    /**
      * `Turn your outline into beautiful, engaging presentations`
      */
    ["com.BrightLoop.payment.ai.benefit.g2-2"](): string;
    /**
      * `Summarize your content into structured mind-map`
      */
    ["com.BrightLoop.payment.ai.benefit.g2-3"](): string;
    /**
      * `Plan with you`
      */
    ["com.BrightLoop.payment.ai.benefit.g3"](): string;
    /**
      * `Memorize and tidy up your knowledge`
      */
    ["com.BrightLoop.payment.ai.benefit.g3-1"](): string;
    /**
      * `Auto-sorting and auto-tagging`
      */
    ["com.BrightLoop.payment.ai.benefit.g3-2"](): string;
    /**
      * `Open source & Privacy ensured`
      */
    ["com.BrightLoop.payment.ai.benefit.g3-3"](): string;
    /**
      * `You have purchased BrightLoop AI. The expiration date is {{end}}.`
      */
    ["com.BrightLoop.payment.ai.billing-tip.end-at"](options: {
        readonly end: string;
    }): string;
    /**
      * `You have purchased BrightLoop AI. The next payment date is {{due}}.`
      */
    ["com.BrightLoop.payment.ai.billing-tip.next-bill-at"](options: {
        readonly due: string;
    }): string;
    /**
      * `Your recent payment failed, the next payment date is {{due}}.`
      */
    ["com.BrightLoop.payment.billing-tip.past-due"](options: {
        readonly due: string;
    }): string;
    /**
      * `You are currently on the Free plan.`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.caption-free"](): string;
    /**
      * `You have purchased BrightLoop AI`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.caption-purchased"](): string;
    /**
      * `Learn about BrightLoop AI`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.learn"](): string;
    /**
      * `BrightLoop AI`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.title"](): string;
    /**
      * `Turn all your ideas into reality`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.title-caption-1"](): string;
    /**
      * `A true multimodal AI copilot.`
      */
    ["com.BrightLoop.payment.ai.pricing-plan.title-caption-2"](): string;
    /**
      * `Billed annually`
      */
    ["com.BrightLoop.payment.ai.subscribe.billed-annually"](): string;
    /**
      * `You have purchased BrightLoop AI.`
      */
    ["com.BrightLoop.payment.ai.usage-description-purchased"](): string;
    /**
      * `BrightLoop AI usage`
      */
    ["com.BrightLoop.payment.ai.usage-title"](): string;
    /**
      * `Change plan`
      */
    ["com.BrightLoop.payment.ai.usage.change-button-label"](): string;
    /**
      * `Purchase`
      */
    ["com.BrightLoop.payment.ai.usage.purchase-button-label"](): string;
    /**
      * `Times used`
      */
    ["com.BrightLoop.payment.ai.usage.used-caption"](): string;
    /**
      * `{{used}}/{{limit}} times`
      */
    ["com.BrightLoop.payment.ai.usage.used-detail"](options: Readonly<{
        used: string;
        limit: string;
    }>): string;
    /**
      * `Active`
      */
    ["com.BrightLoop.payment.subscription-status.active"](): string;
    /**
      * `Past-due bill`
      */
    ["com.BrightLoop.payment.subscription-status.past-due"](): string;
    /**
      * `Trialing`
      */
    ["com.BrightLoop.payment.subscription-status.trialing"](): string;
    /**
      * `Unlimited local workspaces`
      */
    ["com.BrightLoop.payment.benefit-1"](): string;
    /**
      * `Unlimited login devices`
      */
    ["com.BrightLoop.payment.benefit-2"](): string;
    /**
      * `Unlimited blocks`
      */
    ["com.BrightLoop.payment.benefit-3"](): string;
    /**
      * `{{capacity}} of cloud storage`
      */
    ["com.BrightLoop.payment.benefit-4"](options: {
        readonly capacity: string;
    }): string;
    /**
      * `{{capacity}} of maximum file size`
      */
    ["com.BrightLoop.payment.benefit-5"](options: {
        readonly capacity: string;
    }): string;
    /**
      * `Number of members per workspace â‰¤ {{capacity}}`
      */
    ["com.BrightLoop.payment.benefit-6"](options: {
        readonly capacity: string;
    }): string;
    /**
      * `{{capacity}}-days version history`
      */
    ["com.BrightLoop.payment.benefit-7"](options: {
        readonly capacity: string;
    }): string;
    /**
      * `BrightLoop AI`
      */
    ["com.BrightLoop.payment.billing-setting.ai-plan"](): string;
    /**
      * `Purchase`
      */
    ["com.BrightLoop.payment.billing-setting.ai.purchase"](): string;
    /**
      * `Start free trial`
      */
    ["com.BrightLoop.payment.billing-setting.ai.start-free-trial"](): string;
    /**
      * `One-time payment`
      */
    ["com.BrightLoop.payment.billing-setting.believer.price-caption"](): string;
    /**
      * `BrightLoop Cloud`
      */
    ["com.BrightLoop.payment.billing-setting.believer.title"](): string;
    /**
      * `Cancel subscription`
      */
    ["com.BrightLoop.payment.billing-setting.cancel-subscription"](): string;
    /**
      * `Once you canceled subscription you will no longer enjoy the plan benefits.`
      */
    ["com.BrightLoop.payment.billing-setting.cancel-subscription.description"](): string;
    /**
      * `Change plan`
      */
    ["com.BrightLoop.payment.billing-setting.change-plan"](): string;
    /**
      * `BrightLoop Cloud`
      */
    ["com.BrightLoop.payment.billing-setting.current-plan"](): string;
    /**
      * `Expiration date`
      */
    ["com.BrightLoop.payment.billing-setting.expiration-date"](): string;
    /**
      * `Your subscription is valid until {{expirationDate}}`
      */
    ["com.BrightLoop.payment.billing-setting.expiration-date.description"](options: {
        readonly expirationDate: string;
    }): string;
    /**
      * `Billing history`
      */
    ["com.BrightLoop.payment.billing-setting.history"](): string;
    /**
      * `Information`
      */
    ["com.BrightLoop.payment.billing-setting.information"](): string;
    /**
      * `month`
      */
    ["com.BrightLoop.payment.billing-setting.month"](): string;
    /**
      * `There are no invoices to display.`
      */
    ["com.BrightLoop.payment.billing-setting.no-invoice"](): string;
    /**
      * `Paid`
      */
    ["com.BrightLoop.payment.billing-setting.paid"](): string;
    /**
      * `Manage payment details`
      */
    ["com.BrightLoop.payment.billing-setting.payment-method"](): string;
    /**
      * `View future and past invoices, update billing information, and change payment methods. Provided by Stripe.`
      */
    ["com.BrightLoop.payment.billing-setting.payment-method.description"](): string;
    /**
      * `Go`
      */
    ["com.BrightLoop.payment.billing-setting.payment-method.go"](): string;
    /**
      * `Renew date`
      */
    ["com.BrightLoop.payment.billing-setting.renew-date"](): string;
    /**
      * `Next billing date: {{renewDate}}`
      */
    ["com.BrightLoop.payment.billing-setting.renew-date.description"](options: {
        readonly renewDate: string;
    }): string;
    /**
      * `Due date`
      */
    ["com.BrightLoop.payment.billing-setting.due-date"](): string;
    /**
      * `Your subscription will end on {{dueDate}}`
      */
    ["com.BrightLoop.payment.billing-setting.due-date.description"](options: {
        readonly dueDate: string;
    }): string;
    /**
      * `Resume`
      */
    ["com.BrightLoop.payment.billing-setting.resume-subscription"](): string;
    /**
      * `Manage your billing information and invoices`
      */
    ["com.BrightLoop.payment.billing-setting.subtitle"](): string;
    /**
      * `Billing`
      */
    ["com.BrightLoop.payment.billing-setting.title"](): string;
    /**
      * `Update`
      */
    ["com.BrightLoop.payment.billing-setting.update"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.payment.billing-setting.upgrade"](): string;
    /**
      * `View invoice`
      */
    ["com.BrightLoop.payment.billing-setting.view-invoice"](): string;
    /**
      * `year`
      */
    ["com.BrightLoop.payment.billing-setting.year"](): string;
    /**
      * `Please tell us more about your use case, to make BrightLoop better.`
      */
    ["com.BrightLoop.payment.billing-type-form.description"](): string;
    /**
      * `Go`
      */
    ["com.BrightLoop.payment.billing-type-form.go"](): string;
    /**
      * `Tell us your use case`
      */
    ["com.BrightLoop.payment.billing-type-form.title"](): string;
    /**
      * `The maximum file upload size for local workspaces is {{quota}}.`
      */
    ["com.BrightLoop.payment.blob-limit.description.local"](options: {
        readonly quota: string;
    }): string;
    /**
      * `The maximum file upload size for this joined workspace is {{quota}}. You can contact the owner of this workspace.`
      */
    ["com.BrightLoop.payment.blob-limit.description.member"](options: {
        readonly quota: string;
    }): string;
    /**
      * `The maximum file upload size for this workspace is {{quota}}. To proceed, you can:`
      */
    ["com.BrightLoop.payment.blob-limit.description.owner"](options: {
        readonly quota: string;
    }): string;
    /**
      * `Upgrade your account for larger file upload limits`
      */
    ["com.BrightLoop.payment.blob-limit.description.owner.tips-1"](): string;
    /**
      * `Upgrade the workspace plan to increase storage for all member`
      */
    ["com.BrightLoop.payment.blob-limit.description.owner.tips-2"](): string;
    /**
      * `Compress your file and upload again`
      */
    ["com.BrightLoop.payment.blob-limit.description.owner.tips-3"](): string;
    /**
      * `You have reached the limit`
      */
    ["com.BrightLoop.payment.blob-limit.title"](): string;
    /**
      * `Book a demo`
      */
    ["com.BrightLoop.payment.book-a-demo"](): string;
    /**
      * `Buy Pro`
      */
    ["com.BrightLoop.payment.buy-pro"](): string;
    /**
      * `Change to {{to}} Billing`
      */
    ["com.BrightLoop.payment.change-to"](options: {
        readonly to: string;
    }): string;
    /**
      * `Include in FOSS`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g1"](): string;
    /**
      * `Unlimited local workspaces`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g1-1"](): string;
    /**
      * `Unlimited use and customization`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g1-2"](): string;
    /**
      * `Unlimited doc and edgeless editing`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g1-3"](): string;
    /**
      * `Include in Basic`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2"](): string;
    /**
      * `10 GB of cloud storage.`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2-1"](): string;
    /**
      * `10 MB of maximum file size.`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2-2"](): string;
    /**
      * `Up to 3 members per workspace.`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2-3"](): string;
    /**
      * `7-days cloud time machine file version history.`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2-4"](): string;
    /**
      * `Up to 3 login devices.`
      */
    ["com.BrightLoop.payment.cloud.free.benefit.g2-5"](): string;
    /**
      * `Local Editor under MIT license.`
      */
    ["com.BrightLoop.payment.cloud.free.description"](): string;
    /**
      * `Local FOSS + Cloud Basic`
      */
    ["com.BrightLoop.payment.cloud.free.name"](): string;
    /**
      * `Free forever`
      */
    ["com.BrightLoop.payment.cloud.free.title"](): string;
    /**
      * `Included in Pro plan`
      */
    ["com.BrightLoop.payment.cloud.onetime.included"](): string;
    /**
      * `Included in Believer plan`
      */
    ["com.BrightLoop.payment.cloud.lifetime.included"](): string;
    /**
      * `We host, no technical setup required.`
      */
    ["com.BrightLoop.payment.cloud.pricing-plan.select.caption"](): string;
    /**
      * `Hosted by BrightLoop Workspace`
      */
    ["com.BrightLoop.payment.cloud.pricing-plan.select.title"](): string;
    /**
      * `Billed annually`
      */
    ["com.BrightLoop.payment.cloud.pricing-plan.toggle-billed-yearly"](): string;
    /**
      * `Saving {{discount}}%`
      */
    ["com.BrightLoop.payment.cloud.pricing-plan.toggle-discount"](options: {
        readonly discount: string;
    }): string;
    /**
      * `Annually`
      */
    ["com.BrightLoop.payment.cloud.pricing-plan.toggle-yearly"](): string;
    /**
      * `Include in Pro`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1"](): string;
    /**
      * `Everything in BrightLoop FOSS & Basic.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-1"](): string;
    /**
      * `100 GB of cloud storage.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-2"](): string;
    /**
      * `100 MB of maximum file size.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-3"](): string;
    /**
      * `Up to 10 members per workspace.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-4"](): string;
    /**
      * `30-days cloud time machine file version history.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-5"](): string;
    /**
      * `Add comments on Doc and Edgeless.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-6"](): string;
    /**
      * `Community support.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-7"](): string;
    /**
      * `Real-time syncing & collaboration for more people.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-8"](): string;
    /**
      * `Granular edit access to docs.`
      */
    ["com.BrightLoop.payment.cloud.pro.benefit.g1-9"](): string;
    /**
      * `For family and small teams.`
      */
    ["com.BrightLoop.payment.cloud.pro.description"](): string;
    /**
      * `Pro`
      */
    ["com.BrightLoop.payment.cloud.pro.name"](): string;
    /**
      * `annually`
      */
    ["com.BrightLoop.payment.cloud.pro.title.billed-yearly"](): string;
    /**
      * `{{price}} per month`
      */
    ["com.BrightLoop.payment.cloud.pro.title.price-monthly"](options: {
        readonly price: string;
    }): string;
    /**
      * `Include in Team Workspace`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1"](): string;
    /**
      * `Everything in BrightLoop Pro.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-1"](): string;
    /**
      * `100 GB initial storage + 20 GB per seat.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-2"](): string;
    /**
      * `500 MB of maximum file size.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-3"](): string;
    /**
      * `Unlimited team members (10+ seats).`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-4"](): string;
    /**
      * `Multiple admin roles.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-5"](): string;
    /**
      * `Priority customer support.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.benefit.g1-6"](): string;
    /**
      * `Best for scalable teams.`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.description"](): string;
    /**
      * `Team`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.name"](): string;
    /**
      * `annually`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.title.billed-yearly"](): string;
    /**
      * `{{price}} per seat/month`
      */
    ["com.BrightLoop.payment.cloud.team-workspace.title.price-monthly"](options: {
        readonly price: string;
    }): string;
    /**
      * `Contact sales`
      */
    ["com.BrightLoop.payment.contact-sales"](): string;
    /**
      * `Current plan`
      */
    ["com.BrightLoop.payment.current-plan"](): string;
    /**
      * `Start 14-day free trial`
      */
    ["com.BrightLoop.payment.start-free-trial"](): string;
    /**
      * `{{amount}}% off`
      */
    ["com.BrightLoop.payment.discount-amount"](options: {
        readonly amount: string;
    }): string;
    /**
      * `Downgrade`
      */
    ["com.BrightLoop.payment.downgrade"](): string;
    /**
      * `We'd like to hear more about where we fall short, so that we can make BrightLoop better.`
      */
    ["com.BrightLoop.payment.downgraded-notify.content"](): string;
    /**
      * `Later`
      */
    ["com.BrightLoop.payment.downgraded-notify.later"](): string;
    /**
      * `Sure, Open in browser`
      */
    ["com.BrightLoop.payment.downgraded-notify.ok-client"](): string;
    /**
      * `Sure, Open in new tab`
      */
    ["com.BrightLoop.payment.downgraded-notify.ok-web"](): string;
    /**
      * `Sorry to see you go`
      */
    ["com.BrightLoop.payment.downgraded-notify.title"](): string;
    /**
      * `You have successfully downgraded. After the current billing period ends, your account will automatically switch to the Free plan.`
      */
    ["com.BrightLoop.payment.downgraded-tooltip"](): string;
    /**
      * `Best team workspace for collaboration and knowledge distilling.`
      */
    ["com.BrightLoop.payment.dynamic-benefit-1"](): string;
    /**
      * `Focusing on what really matters with team project management and automation.`
      */
    ["com.BrightLoop.payment.dynamic-benefit-2"](): string;
    /**
      * `Pay for seats, fits all team size.`
      */
    ["com.BrightLoop.payment.dynamic-benefit-3"](): string;
    /**
      * `Solutions & best practices for dedicated needs.`
      */
    ["com.BrightLoop.payment.dynamic-benefit-4"](): string;
    /**
      * `Embedable & interrogations with IT support.`
      */
    ["com.BrightLoop.payment.dynamic-benefit-5"](): string;
    /**
      * `Everything in BrightLoop Pro`
      */
    ["com.BrightLoop.payment.lifetime.benefit-1"](): string;
    /**
      * `Life-time personal usage`
      */
    ["com.BrightLoop.payment.lifetime.benefit-2"](): string;
    /**
      * `{{capacity}} Cloud Storage`
      */
    ["com.BrightLoop.payment.lifetime.benefit-3"](options: {
        readonly capacity: string;
    }): string;
    /**
      * `Dedicated Discord support with BrightLoop makers`
      */
    ["com.BrightLoop.payment.lifetime.benefit-4"](): string;
    /**
      * `Become a Life-time supporter?`
      */
    ["com.BrightLoop.payment.lifetime.caption-1"](): string;
    /**
      * `Purchase`
      */
    ["com.BrightLoop.payment.lifetime.purchase"](): string;
    /**
      * `Purchased`
      */
    ["com.BrightLoop.payment.lifetime.purchased"](): string;
    /**
      * `Believer Plan`
      */
    ["com.BrightLoop.payment.lifetime.title"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.payment.member-limit.free.confirm"](): string;
    /**
      * `Workspaces created by {{planName}} users are limited to {{quota}} members. To add more collaborators, you can:`
      */
    ["com.BrightLoop.payment.member-limit.description"](options: Readonly<{
        planName: string;
        quota: string;
    }>): string;
    /**
      * `Upgrade to BrightLoop Pro for expanded member capacity`
      */
    ["com.BrightLoop.payment.member-limit.description.tips-for-free-plan"](): string;
    /**
      * `Convert to a Team Workspace for unlimited collaboration`
      */
    ["com.BrightLoop.payment.member-limit.description.tips-1"](): string;
    /**
      * `Or create a new workspace`
      */
    ["com.BrightLoop.payment.member-limit.description.tips-2"](): string;
    /**
      * `Got it`
      */
    ["com.BrightLoop.payment.member-limit.pro.confirm"](): string;
    /**
      * `You have reached the limit`
      */
    ["com.BrightLoop.payment.member-limit.title"](): string;
    /**
      * `Manage members here. {{planName}} users can invite up to {{memberLimit}}`
      */
    ["com.BrightLoop.payment.member.description"](options: Readonly<{
        planName: string;
        memberLimit: string;
    }>): string;
    /**
      * `Choose your plan`
      */
    ["com.BrightLoop.payment.member.description.choose-plan"](): string;
    /**
      * `go upgrade`
      */
    ["com.BrightLoop.payment.member.description.go-upgrade"](): string;
    /**
      * `Looking to collaborate with more people?`
      */
    ["com.BrightLoop.payment.member.description2"](): string;
    /**
      * `Work together with unlimited team members.`
      */
    ["com.BrightLoop.payment.member.team.description"](): string;
    /**
      * `Invite team members`
      */
    ["com.BrightLoop.payment.member.team.invite.title"](): string;
    /**
      * `Invite new members to join your workspace via email or share an invite link`
      */
    ["com.BrightLoop.payment.member.team.invite.description"](): string;
    /**
      * `Email Invite`
      */
    ["com.BrightLoop.payment.member.team.invite.email-invite"](): string;
    /**
      * `Invite Link`
      */
    ["com.BrightLoop.payment.member.team.invite.invite-link"](): string;
    /**
      * `Email addresses`
      */
    ["com.BrightLoop.payment.member.team.invite.email-addresses"](): string;
    /**
      * `Enter email addresses (separated by commas)`
      */
    ["com.BrightLoop.payment.member.team.invite.email-placeholder"](): string;
    /**
      * `Import CSV`
      */
    ["com.BrightLoop.payment.member.team.invite.import-csv"](): string;
    /**
      * `Send Invites`
      */
    ["com.BrightLoop.payment.member.team.invite.send-invites"](): string;
    /**
      * `Link expiration`
      */
    ["com.BrightLoop.payment.member.team.invite.link-expiration"](): string;
    /**
      * `{{number}} days`
      */
    ["com.BrightLoop.payment.member.team.invite.expiration-date"](options: {
        readonly number: string;
    }): string;
    /**
      * `To expire at: {{expireTime}}`
      */
    ["com.BrightLoop.payment.member.team.invite.expire-at"](options: {
        readonly expireTime: string;
    }): string;
    /**
      * `Invitation link`
      */
    ["com.BrightLoop.payment.member.team.invite.invitation-link"](): string;
    /**
      * `Generate a link to invite members to your workspace`
      */
    ["com.BrightLoop.payment.member.team.invite.invitation-link.description"](): string;
    /**
      * `Generate`
      */
    ["com.BrightLoop.payment.member.team.invite.generate"](): string;
    /**
      * `Copy`
      */
    ["com.BrightLoop.payment.member.team.invite.copy"](): string;
    /**
      * `Done`
      */
    ["com.BrightLoop.payment.member.team.invite.done"](): string;
    /**
      * `Invitation sent,{{successCount}} successful, {{failedCount}} failed`
      */
    ["com.BrightLoop.payment.member.team.invite.notify.title"](options: Readonly<{
        successCount: string;
        failedCount: string;
    }>): string;
    /**
      * `These email addresses have already been invited:`
      */
    ["com.BrightLoop.payment.member.team.invite.notify.fail-message"](): string;
    /**
      * `Revoke invitation`
      */
    ["com.BrightLoop.payment.member.team.revoke"](): string;
    /**
      * `Approve`
      */
    ["com.BrightLoop.payment.member.team.approve"](): string;
    /**
      * `Decline`
      */
    ["com.BrightLoop.payment.member.team.decline"](): string;
    /**
      * `Remove member`
      */
    ["com.BrightLoop.payment.member.team.remove"](): string;
    /**
      * `Retry payment`
      */
    ["com.BrightLoop.payment.member.team.retry-payment"](): string;
    /**
      * `Change role to admin`
      */
    ["com.BrightLoop.payment.member.team.change.admin"](): string;
    /**
      * `Change role to collaborator`
      */
    ["com.BrightLoop.payment.member.team.change.collaborator"](): string;
    /**
      * `Assign as owner`
      */
    ["com.BrightLoop.payment.member.team.assign"](): string;
    /**
      * `Insufficient Team Seats`
      */
    ["com.BrightLoop.payment.member.team.retry-payment.title"](): string;
    /**
      * `The payment for adding new team members has failed. To add more seats, please update your payment method and process unpaid invoices.`
      */
    ["com.BrightLoop.payment.member.team.retry-payment.owner.description"](): string;
    /**
      * `The payment for adding new team members has failed. Please contact your workspace owner to update the payment method and process unpaid invoices.`
      */
    ["com.BrightLoop.payment.member.team.retry-payment.admin.description"](): string;
    /**
      * `Update Payment`
      */
    ["com.BrightLoop.payment.member.team.retry-payment.update-payment"](): string;
    /**
      * `Subscription has been disabled for your team workspace. To add more seats, you'll need to resume subscription first.`
      */
    ["com.BrightLoop.payment.member.team.disabled-subscription.owner.description"](): string;
    /**
      * `Your team workspace has subscription disabled, which prevents adding more seats. Please contact your workspace owner to enable subscription.`
      */
    ["com.BrightLoop.payment.member.team.disabled-subscription.admin.description"](): string;
    /**
      * `Resume Subscription`
      */
    ["com.BrightLoop.payment.member.team.disabled-subscription.resume-subscription"](): string;
    /**
      * `Invitation Revoked`
      */
    ["com.BrightLoop.payment.member.team.revoke.notify.title"](): string;
    /**
      * `You have canceled the invitation for {{name}}`
      */
    ["com.BrightLoop.payment.member.team.revoke.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Request approved`
      */
    ["com.BrightLoop.payment.member.team.approve.notify.title"](): string;
    /**
      * `You have approved the {{name}}â€™s request to join this workspace`
      */
    ["com.BrightLoop.payment.member.team.approve.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Request declined`
      */
    ["com.BrightLoop.payment.member.team.decline.notify.title"](): string;
    /**
      * `You have declined the {{name}}â€™s request to join this workspace`
      */
    ["com.BrightLoop.payment.member.team.decline.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Member removed`
      */
    ["com.BrightLoop.payment.member.team.remove.notify.title"](): string;
    /**
      * `You have removed {{name}} from this workspace`
      */
    ["com.BrightLoop.payment.member.team.remove.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Role Updated`
      */
    ["com.BrightLoop.payment.member.team.change.notify.title"](): string;
    /**
      * `You have successfully promoted {{name}} to Admin.`
      */
    ["com.BrightLoop.payment.member.team.change.admin.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `You have successfully changed {{name}} s role to collaborator.`
      */
    ["com.BrightLoop.payment.member.team.change.collaborator.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Owner assigned`
      */
    ["com.BrightLoop.payment.member.team.assign.notify.title"](): string;
    /**
      * `You have successfully assigned {{name}} as the owner of this workspace.`
      */
    ["com.BrightLoop.payment.member.team.assign.notify.message"](options: {
        readonly name: string;
    }): string;
    /**
      * `Confirm new workspace owner`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.title"](): string;
    /**
      * `You are about to transfer workspace ownership to {{name}}. Please review the following changes carefully:`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.description"](options: {
        readonly name: string;
    }): string;
    /**
      * `This action cannot be undone`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.description-1"](): string;
    /**
      * `Your role will be changed to Admin`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.description-2"](): string;
    /**
      * `You will lose ownership rights to the entire workspace`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.description-3"](): string;
    /**
      * `To confirm this transfer, please type the workspace name`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.description-4"](): string;
    /**
      * `Type workspace name to confirm`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.placeholder"](): string;
    /**
      * `Transfer Ownership`
      */
    ["com.BrightLoop.payment.member.team.assign.confirm.button"](): string;
    /**
      * `Remove member from workspace?`
      */
    ["com.BrightLoop.payment.member.team.remove.confirm.title"](): string;
    /**
      * `This action will revoke their access to all workspace resources immediately.`
      */
    ["com.BrightLoop.payment.member.team.remove.confirm.description"](): string;
    /**
      * `Remove Member`
      */
    ["com.BrightLoop.payment.member.team.remove.confirm.confirm-button"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.payment.member.team.remove.confirm.cancel"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.payment.modal.change.cancel"](): string;
    /**
      * `Change`
      */
    ["com.BrightLoop.payment.modal.change.confirm"](): string;
    /**
      * `Change your subscription`
      */
    ["com.BrightLoop.payment.modal.change.title"](): string;
    /**
      * `Cancel subscription`
      */
    ["com.BrightLoop.payment.modal.downgrade.cancel"](): string;
    /**
      * `You can still use BrightLoop Cloud Pro until the end of this billing period :)`
      */
    ["com.BrightLoop.payment.modal.downgrade.caption"](): string;
    /**
      * `Keep BrightLoop Cloud Pro`
      */
    ["com.BrightLoop.payment.modal.downgrade.confirm"](): string;
    /**
      * `Keep Team plan`
      */
    ["com.BrightLoop.payment.modal.downgrade.team-confirm"](): string;
    /**
      * `We're sorry to see you go, but we're always working to improve, and your feedback is welcome. We hope to see you return in the future.`
      */
    ["com.BrightLoop.payment.modal.downgrade.content"](): string;
    /**
      * `Are you sure?`
      */
    ["com.BrightLoop.payment.modal.downgrade.title"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.payment.modal.resume.cancel"](): string;
    /**
      * `Confirm`
      */
    ["com.BrightLoop.payment.modal.resume.confirm"](): string;
    /**
      * `Are you sure you want to resume the subscription for your pro account? This means your payment method will be charged automatically at the end of each billing cycle, starting from the next billing cycle.`
      */
    ["com.BrightLoop.payment.modal.resume.content"](): string;
    /**
      * `Resume auto-renewal?`
      */
    ["com.BrightLoop.payment.modal.resume.title"](): string;
    /**
      * `Refresh`
      */
    ["com.BrightLoop.payment.plans-error-retry"](): string;
    /**
      * `Unable to load pricing plans, please check your network. `
      */
    ["com.BrightLoop.payment.plans-error-tip"](): string;
    /**
      * `monthly`
      */
    ["com.BrightLoop.payment.recurring-monthly"](): string;
    /**
      * `annually`
      */
    ["com.BrightLoop.payment.recurring-yearly"](): string;
    /**
      * `Resume`
      */
    ["com.BrightLoop.payment.resume"](): string;
    /**
      * `Subscription Resumed`
      */
    ["com.BrightLoop.payment.resume.success.title"](): string;
    /**
      * `Your team workspace subscription has been enabled successfully. Changes will take effect immediately.`
      */
    ["com.BrightLoop.payment.resume.success.team.message"](): string;
    /**
      * `Resume auto-renewal`
      */
    ["com.BrightLoop.payment.resume-renewal"](): string;
    /**
      * `See all plans`
      */
    ["com.BrightLoop.payment.see-all-plans"](): string;
    /**
      * `Sign up free`
      */
    ["com.BrightLoop.payment.sign-up-free"](): string;
    /**
      * `Cloud storage is insufficient. Please contact the owner of that workspace.`
      */
    ["com.BrightLoop.payment.storage-limit.description.member"](): string;
    /**
      * `Cloud storage is insufficient. You can upgrade your account to unlock more cloud storage.`
      */
    ["com.BrightLoop.payment.storage-limit.description.owner"](): string;
    /**
      * `Unable to sync due to insufficient storage space. You can remove excess content, upgrade your account, or increase your workspace storage to resolve this issue.`
      */
    ["com.BrightLoop.payment.storage-limit.new-description.owner"](): string;
    /**
      * `Sync failed due to storage space limit`
      */
    ["com.BrightLoop.payment.storage-limit.new-title"](): string;
    /**
      * `View`
      */
    ["com.BrightLoop.payment.storage-limit.view"](): string;
    /**
      * `You are currently on the {{plan}} plan. After the current billing period ends, your account will automatically switch to the Free plan.`
      */
    ["com.BrightLoop.payment.subtitle-canceled"](options: {
        readonly plan: string;
    }): string;
    /**
      * `This is the pricing plans of BrightLoop Cloud. You can sign up or sign in to your account first.`
      */
    ["com.BrightLoop.payment.subtitle-not-signed-in"](): string;
    /**
      * `See all plans`
      */
    ["com.BrightLoop.payment.tag-tooltips"](): string;
    /**
      * `Tell us your use case`
      */
    ["com.BrightLoop.payment.tell-us-use-case"](): string;
    /**
      * `Pricing plans`
      */
    ["com.BrightLoop.payment.title"](): string;
    /**
      * `You have changed your plan to {{plan}} billing.`
      */
    ["com.BrightLoop.payment.updated-notify-msg"](options: {
        readonly plan: string;
    }): string;
    /**
      * `Subscription updated`
      */
    ["com.BrightLoop.payment.updated-notify-title"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.payment.upgrade"](): string;
    /**
      * `Redeem code`
      */
    ["com.BrightLoop.payment.redeem-code"](): string;
    /**
      * `We'd like to hear more about your use case, so that we can make BrightLoop better.`
      */
    ["com.BrightLoop.payment.upgrade-success-notify.content"](): string;
    /**
      * `Later`
      */
    ["com.BrightLoop.payment.upgrade-success-notify.later"](): string;
    /**
      * `Sure, open in browser`
      */
    ["com.BrightLoop.payment.upgrade-success-notify.ok-client"](): string;
    /**
      * `Sure, open in new tab`
      */
    ["com.BrightLoop.payment.upgrade-success-notify.ok-web"](): string;
    /**
      * `Thanks for subscribing!`
      */
    ["com.BrightLoop.payment.upgrade-success-notify.title"](): string;
    /**
      * `Congratulations! Your BrightLoop account has been successfully upgraded to a Pro account.`
      */
    ["com.BrightLoop.payment.upgrade-success-page.text"](): string;
    /**
      * `Upgrade successful!`
      */
    ["com.BrightLoop.payment.upgrade-success-page.title"](): string;
    /**
      * `Congratulations! Your workspace has been successfully upgraded to a Team Workspace. Now you can invite unlimited members to collaborate in this workspace.`
      */
    ["com.BrightLoop.payment.upgrade-success-page.team.text-1"](): string;
    /**
      * `Thank you for your purchase!`
      */
    ["com.BrightLoop.payment.license-success.title"](): string;
    /**
      * `Thank you for purchasing the BrightLoop self-hosted license.`
      */
    ["com.BrightLoop.payment.license-success.text-1"](): string;
    /**
      * `You can use this key to upgrade in Settings > Workspace > Billing > Upgrade`
      */
    ["com.BrightLoop.payment.license-success.hint"](): string;
    /**
      * `Open BrightLoop`
      */
    ["com.BrightLoop.payment.license-success.open-BrightLoop"](): string;
    /**
      * `Copied key to clipboard`
      */
    ["com.BrightLoop.payment.license-success.copy"](): string;
    /**
      * `Close`
      */
    ["com.BrightLoop.peek-view-controls.close"](): string;
    /**
      * `Open this doc`
      */
    ["com.BrightLoop.peek-view-controls.open-doc"](): string;
    /**
      * `Open in edgeless`
      */
    ["com.BrightLoop.peek-view-controls.open-doc-in-edgeless"](): string;
    /**
      * `Open in new tab`
      */
    ["com.BrightLoop.peek-view-controls.open-doc-in-new-tab"](): string;
    /**
      * `Open in split view`
      */
    ["com.BrightLoop.peek-view-controls.open-doc-in-split-view"](): string;
    /**
      * `Open doc info`
      */
    ["com.BrightLoop.peek-view-controls.open-info"](): string;
    /**
      * `Open this attachment`
      */
    ["com.BrightLoop.peek-view-controls.open-attachment"](): string;
    /**
      * `Open in new tab`
      */
    ["com.BrightLoop.peek-view-controls.open-attachment-in-new-tab"](): string;
    /**
      * `Open in split view`
      */
    ["com.BrightLoop.peek-view-controls.open-attachment-in-split-view"](): string;
    /**
      * `Open in center peek`
      */
    ["com.BrightLoop.peek-view-controls.open-doc-in-center-peek"](): string;
    /**
      * `Copy link`
      */
    ["com.BrightLoop.peek-view-controls.copy-link"](): string;
    /**
      * `Click or drag`
      */
    ["com.BrightLoop.split-view-drag-handle.tooltip"](): string;
    /**
      * `Split view does not support folders.`
      */
    ["com.BrightLoop.split-view-folder-warning.description"](): string;
    /**
      * `Do not show this again`
      */
    ["do-not-show-this-again"](): string;
    /**
      * `New`
      */
    ["com.BrightLoop.quicksearch.group.creation"](): string;
    /**
      * `Search for "{{query}}"`
      */
    ["com.BrightLoop.quicksearch.group.searchfor"](options: {
        readonly query: string;
    }): string;
    /**
      * `Reset sync`
      */
    ["com.BrightLoop.resetSyncStatus.button"](): string;
    /**
      * `This operation may fix some synchronization issues.`
      */
    ["com.BrightLoop.resetSyncStatus.description"](): string;
    /**
      * `Collections`
      */
    ["com.BrightLoop.rootAppSidebar.collections"](): string;
    /**
      * `Notifications`
      */
    ["com.BrightLoop.rootAppSidebar.notifications"](): string;
    /**
      * `Only doc can be placed on here`
      */
    ["com.BrightLoop.rootAppSidebar.doc.link-doc-only"](): string;
    /**
      * `No linked docs`
      */
    ["com.BrightLoop.rootAppSidebar.docs.no-subdoc"](): string;
    /**
      * `Loading linked docs...`
      */
    ["com.BrightLoop.rootAppSidebar.docs.references-loading"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.collection-add-tooltip"](): string;
    /**
      * `New collection`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.collection-section-add-tooltip"](): string;
    /**
      * `New linked doc`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.doc-add-tooltip"](): string;
    /**
      * `Copy`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.drop-effect.copy"](): string;
    /**
      * `Link`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.drop-effect.link"](): string;
    /**
      * `Move`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.drop-effect.move"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.fav-section-add-tooltip"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.organize-add-tooltip"](): string;
    /**
      * `New folder`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.organize-section-add-tooltip"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.tag-add-tooltip"](): string;
    /**
      * `New tag`
      */
    ["com.BrightLoop.rootAppSidebar.explorer.tag-section-add-tooltip"](): string;
    /**
      * `Favorites`
      */
    ["com.BrightLoop.rootAppSidebar.favorites"](): string;
    /**
      * `No favorites`
      */
    ["com.BrightLoop.rootAppSidebar.favorites.empty"](): string;
    /**
      * `Migration data`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data"](): string;
    /**
      * `Empty the old favorites`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.clean-all"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.clean-all.cancel"](): string;
    /**
      * `OK`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.clean-all.confirm"](): string;
    /**
      * `The old "Favorites" will be replaced`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.help"](): string;
    /**
      * `Empty the old favorites`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.help.clean-all"](): string;
    /**
      * `OK`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.help.confirm"](): string;
    /**
      * `Organize`
      */
    ["com.BrightLoop.rootAppSidebar.organize"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.rootAppSidebar.organize.delete"](): string;
    /**
      * `Remove from folder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.delete-from-folder"](): string;
    /**
      * `Delete the folder will not delete any docs, tags, or collections.`
      */
    ["com.BrightLoop.rootAppSidebar.organize.delete.notify-message"](): string;
    /**
      * `Delete {{name}}`
      */
    ["com.BrightLoop.rootAppSidebar.organize.delete.notify-title"](options: {
        readonly name: string;
    }): string;
    /**
      * `No folders`
      */
    ["com.BrightLoop.rootAppSidebar.organize.empty"](): string;
    /**
      * `Empty folder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.empty-folder"](): string;
    /**
      * `Add pages`
      */
    ["com.BrightLoop.rootAppSidebar.organize.empty-folder.add-pages"](): string;
    /**
      * `New folder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.empty.new-folders-button"](): string;
    /**
      * `Add to favorites`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder-add-favorite"](): string;
    /**
      * `Remove from favorites`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder-rm-favorite"](): string;
    /**
      * `Add Collections`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder.add-collections"](): string;
    /**
      * `New doc`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder.new-doc"](): string;
    /**
      * `Add others`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder.add-others"](): string;
    /**
      * `Add tags`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder.add-tags"](): string;
    /**
      * `Create a subfolder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.folder.create-subfolder"](): string;
    /**
      * `New folder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.new-folders"](): string;
    /**
      * `Only folder can be placed on here`
      */
    ["com.BrightLoop.rootAppSidebar.organize.root-folder-only"](): string;
    /**
      * `Add More`
      */
    ["com.BrightLoop.rootAppSidebar.organize.add-more"](): string;
    /**
      * `Add Folder`
      */
    ["com.BrightLoop.rootAppSidebar.organize.add-folder"](): string;
    /**
      * `New Collection`
      */
    ["com.BrightLoop.rootAppSidebar.collection.new"](): string;
    /**
      * `Others`
      */
    ["com.BrightLoop.rootAppSidebar.others"](): string;
    /**
      * `Only doc can be placed on here`
      */
    ["com.BrightLoop.rootAppSidebar.tag.doc-only"](): string;
    /**
      * `Tags`
      */
    ["com.BrightLoop.rootAppSidebar.tags"](): string;
    /**
      * `No tags`
      */
    ["com.BrightLoop.rootAppSidebar.tags.empty"](): string;
    /**
      * `New tag`
      */
    ["com.BrightLoop.rootAppSidebar.tags.empty.new-tag-button"](): string;
    /**
      * `New tag`
      */
    ["com.BrightLoop.rootAppSidebar.tags.new-tag"](): string;
    /**
      * `No docs`
      */
    ["com.BrightLoop.rootAppSidebar.tags.no-doc"](): string;
    /**
      * `Drag to resize`
      */
    ["com.BrightLoop.rootAppSidebar.resize-handle.tooltip.drag"](): string;
    /**
      * `Click to collapse`
      */
    ["com.BrightLoop.rootAppSidebar.resize-handle.tooltip.click"](): string;
    /**
      * `Type here ...`
      */
    ["com.BrightLoop.search-tags.placeholder"](): string;
    /**
      * `Empty`
      */
    ["com.BrightLoop.selectPage.empty"](): string;
    /**
      * `Selected`
      */
    ["com.BrightLoop.selectPage.selected"](): string;
    /**
      * `Add include doc`
      */
    ["com.BrightLoop.selectPage.title"](): string;
    /**
      * `Search collections...`
      */
    ["com.BrightLoop.selector-collection.search.placeholder"](): string;
    /**
      * `Search tags...`
      */
    ["com.BrightLoop.selector-tag.search.placeholder"](): string;
    /**
      * `Notifications`
      */
    ["com.BrightLoop.setting.notifications"](): string;
    /**
      * `Notifications`
      */
    ["com.BrightLoop.setting.notifications.header.title"](): string;
    /**
      * `Choose the types of updates you want to receive and where to get them.`
      */
    ["com.BrightLoop.setting.notifications.header.description"](): string;
    /**
      * `Email notifications`
      */
    ["com.BrightLoop.setting.notifications.email.title"](): string;
    /**
      * `Mention`
      */
    ["com.BrightLoop.setting.notifications.email.mention.title"](): string;
    /**
      * `You will be notified through email when other members of the workspace @ you.`
      */
    ["com.BrightLoop.setting.notifications.email.mention.subtitle"](): string;
    /**
      * `Invites`
      */
    ["com.BrightLoop.setting.notifications.email.invites.title"](): string;
    /**
      * `Invitation related messages will be sent through emails.`
      */
    ["com.BrightLoop.setting.notifications.email.invites.subtitle"](): string;
    /**
      * `Account settings`
      */
    ["com.BrightLoop.setting.account"](): string;
    /**
      * `Delete account`
      */
    ["com.BrightLoop.setting.account.delete"](): string;
    /**
      * `Permanently delete this account and the Workspace data backup in BrightLoop Cloud. This action can not be undone.`
      */
    ["com.BrightLoop.setting.account.delete.message"](): string;
    /**
      * `Your personal information`
      */
    ["com.BrightLoop.setting.account.message"](): string;
    /**
      * `Sync with BrightLoop Cloud`
      */
    ["com.BrightLoop.setting.sign.message"](): string;
    /**
      * `Securely sign out of your account.`
      */
    ["com.BrightLoop.setting.sign.out.message"](): string;
    /**
      * `General`
      */
    ["com.BrightLoop.settingSidebar.settings.general"](): string;
    /**
      * `Workspace`
      */
    ["com.BrightLoop.settingSidebar.settings.workspace"](): string;
    /**
      * `Settings`
      */
    ["com.BrightLoop.settingSidebar.title"](): string;
    /**
      * `Appearance`
      */
    ["com.BrightLoop.settings.appearance"](): string;
    /**
      * `Customise the appearance of the client.`
      */
    ["com.BrightLoop.settings.appearance.border-style-description"](): string;
    /**
      * `Customise your date style.`
      */
    ["com.BrightLoop.settings.appearance.date-format-description"](): string;
    /**
      * `Maximum display of content within a doc.`
      */
    ["com.BrightLoop.settings.appearance.full-width-description"](): string;
    /**
      * `Select the language for the interface.`
      */
    ["com.BrightLoop.settings.appearance.language-description"](): string;
    /**
      * `By default, the week starts on Sunday.`
      */
    ["com.BrightLoop.settings.appearance.start-week-description"](): string;
    /**
      * `Customise appearance of Windows Client.`
      */
    ["com.BrightLoop.settings.appearance.window-frame-description"](): string;
    /**
      * `Links`
      */
    ["com.BrightLoop.setting.appearance.links"](): string;
    /**
      * `Open BrightLoop links`
      */
    ["com.BrightLoop.setting.appearance.open-in-app"](): string;
    /**
      * `You can choose to open the link in the desktop app or directly in the browser.`
      */
    ["com.BrightLoop.setting.appearance.open-in-app.hint"](): string;
    /**
      * `Ask me each time`
      */
    ["com.BrightLoop.setting.appearance.open-in-app.always-ask"](): string;
    /**
      * `Open links in desktop app`
      */
    ["com.BrightLoop.setting.appearance.open-in-app.open-in-desktop-app"](): string;
    /**
      * `Open links in browser`
      */
    ["com.BrightLoop.setting.appearance.open-in-app.open-in-web"](): string;
    /**
      * `Open BrightLoop links`
      */
    ["com.BrightLoop.setting.appearance.open-in-app.title"](): string;
    /**
      * `Open this doc in BrightLoop app`
      */
    ["com.BrightLoop.open-in-app.card.title"](): string;
    /**
      * `Open in app`
      */
    ["com.BrightLoop.open-in-app.card.button.open"](): string;
    /**
      * `Dismiss`
      */
    ["com.BrightLoop.open-in-app.card.button.dismiss"](): string;
    /**
      * `Remember choice`
      */
    ["com.BrightLoop.open-in-app.card.remember"](): string;
    /**
      * `Download desktop app`
      */
    ["com.BrightLoop.open-in-app.card.download"](): string;
    /**
      * `If enabled, it will automatically check for new versions at regular intervals.`
      */
    ["com.BrightLoop.settings.auto-check-description"](): string;
    /**
      * `If enabled, new versions will be automatically downloaded to the current device.`
      */
    ["com.BrightLoop.settings.auto-download-description"](): string;
    /**
      * `Editor`
      */
    ["com.BrightLoop.settings.editorSettings"](): string;
    /**
      * `Edgeless`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless"](): string;
    /**
      * `Connector`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter"](): string;
    /**
      * `Border style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.border-style"](): string;
    /**
      * `Border thickness`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.border-thickness"](): string;
    /**
      * `Color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.color"](): string;
    /**
      * `Connector shape`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.connector-shape"](): string;
    /**
      * `Curve`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.connector-shape.curve"](): string;
    /**
      * `Elbowed`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.connector-shape.elbowed"](): string;
    /**
      * `Straight`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.connector-shape.straight"](): string;
    /**
      * `End endpoint`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.end-endpoint"](): string;
    /**
      * `Start endpoint`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.connecter.start-endpoint"](): string;
    /**
      * `Custom`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.custom"](): string;
    /**
      * `Mind Map`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.mind-map"](): string;
    /**
      * `Layout`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.mind-map.layout"](): string;
    /**
      * `Left`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.mind-map.layout.left"](): string;
    /**
      * `Radial`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.mind-map.layout.radial"](): string;
    /**
      * `Right`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.mind-map.layout.right"](): string;
    /**
      * `Note`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note"](): string;
    /**
      * `Background`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.background"](): string;
    /**
      * `Border style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.border"](): string;
    /**
      * `Border thickness`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.border-thickness"](): string;
    /**
      * `Dash`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.border.dash"](): string;
    /**
      * `None`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.border.none"](): string;
    /**
      * `Solid`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.border.solid"](): string;
    /**
      * `Corners`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.corners"](): string;
    /**
      * `Shadow style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.note.shadow"](): string;
    /**
      * `Pen`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.pen"](): string;
    /**
      * `Color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.pen.color"](): string;
    /**
      * `Thickness`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.pen.thickness"](): string;
    /**
      * `Shape`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape"](): string;
    /**
      * `Border color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.border-color"](): string;
    /**
      * `Border style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.border-style"](): string;
    /**
      * `Border thickness`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.border-thickness"](): string;
    /**
      * `Diamond`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.diamond"](): string;
    /**
      * `Ellipse`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.ellipse"](): string;
    /**
      * `Fill color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.fill-color"](): string;
    /**
      * `Flow`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.flow"](): string;
    /**
      * `Font`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.font"](): string;
    /**
      * `Font size`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.font-size"](): string;
    /**
      * `Font style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.font-style"](): string;
    /**
      * `List`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.list"](): string;
    /**
      * `Rounded Rectangle`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.rounded-rectangle"](): string;
    /**
      * `Square`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.square"](): string;
    /**
      * `Text alignment`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.text-alignment"](): string;
    /**
      * `Text color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.text-color"](): string;
    /**
      * `Triangle`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.shape.triangle"](): string;
    /**
      * `Frame`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.frame"](): string;
    /**
      * `Background`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.frame.background"](): string;
    /**
      * `Style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.style"](): string;
    /**
      * `General`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.style.general"](): string;
    /**
      * `Scribbled`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.style.scribbled"](): string;
    /**
      * `Text`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text"](): string;
    /**
      * `Alignment`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.alignment"](): string;
    /**
      * `Center`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.alignment.center"](): string;
    /**
      * `Left`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.alignment.left"](): string;
    /**
      * `Right`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.alignment.right"](): string;
    /**
      * `Text color`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.color"](): string;
    /**
      * `Font`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.font"](): string;
    /**
      * `Font family`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.font-family"](): string;
    /**
      * `Font size`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.font-size"](): string;
    /**
      * `Font style`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.font-style"](): string;
    /**
      * `Font weight`
      */
    ["com.BrightLoop.settings.editorSettings.edgeless.text.font-weight"](): string;
    /**
      * `General`
      */
    ["com.BrightLoop.settings.editorSettings.general"](): string;
    /**
      * `Enable the powerful AI assistant, BrightLoop AI.`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.description"](): string;
    /**
      * `Disable AI and Reload`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.disable.confirm"](): string;
    /**
      * `Are you sure you want to disable AI? We value your productivity and our AI can enhance it. Please think again!`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.disable.description"](): string;
    /**
      * `Disable AI?`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.disable.title"](): string;
    /**
      * `Enable AI and Reload`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.enable.confirm"](): string;
    /**
      * `Do you want to enable AI? Our AI assistant is ready to enhance your productivity and provide smart assistance. Let's get started! We need reload page to make this change.`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.enable.description"](): string;
    /**
      * `Enable AI?`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.enable.title"](): string;
    /**
      * `BrightLoop AI`
      */
    ["com.BrightLoop.settings.editorSettings.general.ai.title"](): string;
    /**
      * `Set a default programming language.`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-code-block.language.description"](): string;
    /**
      * `Code blocks default language`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-code-block.language.title"](): string;
    /**
      * `Encapsulate code snippets for better readability.`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-code-block.wrap.description"](): string;
    /**
      * `Wrap code in code blocks`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-code-block.wrap.title"](): string;
    /**
      * `Default mode for new doc.`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-new-doc.description"](): string;
    /**
      * `New doc default mode`
      */
    ["com.BrightLoop.settings.editorSettings.general.default-new-doc.title"](): string;
    /**
      * `Customize your text experience.`
      */
    ["com.BrightLoop.settings.editorSettings.general.font-family.custom.description"](): string;
    /**
      * `Custom font family`
      */
    ["com.BrightLoop.settings.editorSettings.general.font-family.custom.title"](): string;
    /**
      * `Choose your editor's font family.`
      */
    ["com.BrightLoop.settings.editorSettings.general.font-family.description"](): string;
    /**
      * `Font family`
      */
    ["com.BrightLoop.settings.editorSettings.general.font-family.title"](): string;
    /**
      * `Automatically detect and correct spelling errors.`
      */
    ["com.BrightLoop.settings.editorSettings.general.spell-check.description"](): string;
    /**
      * `Spell check`
      */
    ["com.BrightLoop.settings.editorSettings.general.spell-check.title"](): string;
    /**
      * `Page`
      */
    ["com.BrightLoop.settings.editorSettings.page"](): string;
    /**
      * `Middle click paste`
      */
    ["com.BrightLoop.settings.editorSettings.general.middle-click-paste.title"](): string;
    /**
      * `Enable default middle click paste behavior on Linux.`
      */
    ["com.BrightLoop.settings.editorSettings.general.middle-click-paste.description"](): string;
    /**
      * `Display bi-directional links on the doc.`
      */
    ["com.BrightLoop.settings.editorSettings.page.display-bi-link.description"](): string;
    /**
      * `Display bi-directional links`
      */
    ["com.BrightLoop.settings.editorSettings.page.display-bi-link.title"](): string;
    /**
      * `Display document information on the doc.`
      */
    ["com.BrightLoop.settings.editorSettings.page.display-doc-info.description"](): string;
    /**
      * `Display doc info`
      */
    ["com.BrightLoop.settings.editorSettings.page.display-doc-info.title"](): string;
    /**
      * `Maximise display of content within a page.`
      */
    ["com.BrightLoop.settings.editorSettings.page.full-width.description"](): string;
    /**
      * `Full width layout`
      */
    ["com.BrightLoop.settings.editorSettings.page.full-width.title"](): string;
    /**
      * `Default page width`
      */
    ["com.BrightLoop.settings.editorSettings.page.default-page-width.title"](): string;
    /**
      * `Set default width for new pages, individual pages can override.`
      */
    ["com.BrightLoop.settings.editorSettings.page.default-page-width.description"](): string;
    /**
      * `Standard`
      */
    ["com.BrightLoop.settings.editorSettings.page.default-page-width.standard"](): string;
    /**
      * `Full width`
      */
    ["com.BrightLoop.settings.editorSettings.page.default-page-width.full-width"](): string;
    /**
      * `Set edgeless default color scheme.`
      */
    ["com.BrightLoop.settings.editorSettings.page.edgeless-default-theme.description"](): string;
    /**
      * `Edgeless default theme`
      */
    ["com.BrightLoop.settings.editorSettings.page.edgeless-default-theme.title"](): string;
    /**
      * `Specified by current color mode`
      */
    ["com.BrightLoop.settings.editorSettings.page.edgeless-default-theme.specified"](): string;
    /**
      * `Scroll wheel zoom`
      */
    ["com.BrightLoop.settings.editorSettings.page.edgeless-scroll-wheel-zoom.title"](): string;
    /**
      * `Use the scroll wheel to zoom in and out.`
      */
    ["com.BrightLoop.settings.editorSettings.page.edgeless-scroll-wheel-zoom.description"](): string;
    /**
      * `Preferences`
      */
    ["com.BrightLoop.settings.editorSettings.preferences"](): string;
    /**
      * `You can export the entire preferences data for backup, and the exported data can be re-imported.`
      */
    ["com.BrightLoop.settings.editorSettings.preferences.export.description"](): string;
    /**
      * `Export Settings`
      */
    ["com.BrightLoop.settings.editorSettings.preferences.export.title"](): string;
    /**
      * `You can import previously exported preferences data for restoration.`
      */
    ["com.BrightLoop.settings.editorSettings.preferences.import.description"](): string;
    /**
      * `Import Settings`
      */
    ["com.BrightLoop.settings.editorSettings.preferences.import.title"](): string;
    /**
      * `Configure your own editor`
      */
    ["com.BrightLoop.settings.editorSettings.subtitle"](): string;
    /**
      * `Editor settings`
      */
    ["com.BrightLoop.settings.editorSettings.title"](): string;
    /**
      * `Ask me every time`
      */
    ["com.BrightLoop.settings.editorSettings.ask-me-every-time"](): string;
    /**
      * `Email`
      */
    ["com.BrightLoop.settings.email"](): string;
    /**
      * `Change email`
      */
    ["com.BrightLoop.settings.email.action"](): string;
    /**
      * `Change email`
      */
    ["com.BrightLoop.settings.email.action.change"](): string;
    /**
      * `Verify email`
      */
    ["com.BrightLoop.settings.email.action.verify"](): string;
    /**
      * `Enable BrightLoop Cloud to collaborate with others`
      */
    ["com.BrightLoop.settings.member-tooltip"](): string;
    /**
      * `Loading member list...`
      */
    ["com.BrightLoop.settings.member.loading"](): string;
    /**
      * `Noise background on the sidebar`
      */
    ["com.BrightLoop.settings.noise-style"](): string;
    /**
      * `Use background noise effect on the sidebar.`
      */
    ["com.BrightLoop.settings.noise-style-description"](): string;
    /**
      * `Password`
      */
    ["com.BrightLoop.settings.password"](): string;
    /**
      * `Change password`
      */
    ["com.BrightLoop.settings.password.action.change"](): string;
    /**
      * `Set password`
      */
    ["com.BrightLoop.settings.password.action.set"](): string;
    /**
      * `Set a password to sign in to your account`
      */
    ["com.BrightLoop.settings.password.message"](): string;
    /**
      * `My profile`
      */
    ["com.BrightLoop.settings.profile"](): string;
    /**
      * `Your account profile will be displayed to everyone.`
      */
    ["com.BrightLoop.settings.profile.message"](): string;
    /**
      * `Display name`
      */
    ["com.BrightLoop.settings.profile.name"](): string;
    /**
      * `Input account name`
      */
    ["com.BrightLoop.settings.profile.placeholder"](): string;
    /**
      * `Remove workspace`
      */
    ["com.BrightLoop.settings.remove-workspace"](): string;
    /**
      * `Remove workspace from this device and optionally delete all data.`
      */
    ["com.BrightLoop.settings.remove-workspace-description"](): string;
    /**
      * `Sign in / Sign up`
      */
    ["com.BrightLoop.settings.sign"](): string;
    /**
      * `Need more customization options? Tell us in the community.`
      */
    ["com.BrightLoop.settings.suggestion"](): string;
    /**
      * `Translucent UI on the sidebar`
      */
    ["com.BrightLoop.settings.translucent-style"](): string;
    /**
      * `Use transparency effect on the sidebar.`
      */
    ["com.BrightLoop.settings.translucent-style-description"](): string;
    /**
      * `Meetings`
      */
    ["com.BrightLoop.settings.meetings"](): string;
    /**
      * `Enable meeting notes`
      */
    ["com.BrightLoop.settings.meetings.enable.title"](): string;
    /**
      * `Meeting recording`
      */
    ["com.BrightLoop.settings.meetings.record.header"](): string;
    /**
      * `When meeting starts`
      */
    ["com.BrightLoop.settings.meetings.record.recording-mode"](): string;
    /**
      * `Choose the behavior when the meeting starts.`
      */
    ["com.BrightLoop.settings.meetings.record.recording-mode.description"](): string;
    /**
      * `Open saved recordings`
      */
    ["com.BrightLoop.settings.meetings.record.open-saved-file"](): string;
    /**
      * `Open the locally stored recording files.`
      */
    ["com.BrightLoop.settings.meetings.record.open-saved-file.description"](): string;
    /**
      * `Transcription with AI`
      */
    ["com.BrightLoop.settings.meetings.transcription.header"](): string;
    /**
      * `Auto transcription`
      */
    ["com.BrightLoop.settings.meetings.transcription.auto-transcription"](): string;
    /**
      * `Automatically transcribe the meeting notes.`
      */
    ["com.BrightLoop.settings.meetings.transcription.auto-transcription.description"](): string;
    /**
      * `Privacy & Security`
      */
    ["com.BrightLoop.settings.meetings.privacy.header"](): string;
    /**
      * `Screen & System audio recording`
      */
    ["com.BrightLoop.settings.meetings.privacy.screen-system-audio-recording"](): string;
    /**
      * `The Meeting feature requires permission to be used.`
      */
    ["com.BrightLoop.settings.meetings.privacy.screen-system-audio-recording.description"](): string;
    /**
      * `Click to allow`
      */
    ["com.BrightLoop.settings.meetings.privacy.screen-system-audio-recording.permission-setting"](): string;
    /**
      * `Microphone`
      */
    ["com.BrightLoop.settings.meetings.privacy.microphone"](): string;
    /**
      * `The Meeting feature requires permission to be used.`
      */
    ["com.BrightLoop.settings.meetings.privacy.microphone.description"](): string;
    /**
      * `Click to allow`
      */
    ["com.BrightLoop.settings.meetings.privacy.microphone.permission-setting"](): string;
    /**
      * `Do nothing`
      */
    ["com.BrightLoop.settings.meetings.record.recording-mode.none"](): string;
    /**
      * `Auto start recording`
      */
    ["com.BrightLoop.settings.meetings.record.recording-mode.auto-start"](): string;
    /**
      * `Show a recording prompt`
      */
    ["com.BrightLoop.settings.meetings.record.recording-mode.prompt"](): string;
    /**
      * `Screen & System Audio Recording`
      */
    ["com.BrightLoop.settings.meetings.record.permission-modal.title"](): string;
    /**
      * `BrightLoop will generate meeting notes by recording your meetings. Authorization to "Screen & System Audio Recording" is necessary.`
      */
    ["com.BrightLoop.settings.meetings.record.permission-modal.description"](): string;
    /**
      * `Save meeting's recording block to`
      */
    ["com.BrightLoop.settings.meetings.record.save-mode"](): string;
    /**
      * `Open System Settings`
      */
    ["com.BrightLoop.settings.meetings.record.permission-modal.open-setting"](): string;
    /**
      * `Workspace`
      */
    ["com.BrightLoop.settings.workspace"](): string;
    /**
      * `You can view current workspace's information here.`
      */
    ["com.BrightLoop.settings.workspace.description"](): string;
    /**
      * `Experimental features`
      */
    ["com.BrightLoop.settings.workspace.experimental-features"](): string;
    /**
      * `Get started`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.get-started"](): string;
    /**
      * `Experimental features`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.header.plugins"](): string;
    /**
      * `Some features available for early access`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.header.subtitle"](): string;
    /**
      * `I am aware of the risks, and I am willing to continue to use it.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.prompt-disclaimer"](): string;
    /**
      * `Do you want to use the plugin system that is in an experimental stage?`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.prompt-header"](): string;
    /**
      * `You are about to enable an experimental feature. This feature is still in development and may contain errors or behave unpredictably. Please proceed with caution and at your own risk.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.prompt-warning"](): string;
    /**
      * `WARNING MESSAGE`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.prompt-warning-title"](): string;
    /**
      * `Enable AI`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai.name"](): string;
    /**
      * `Enable or disable ALL AI features.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai.description"](): string;
    /**
      * `Enable AI Network Search`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-network-search.name"](): string;
    /**
      * `Enable or disable AI Network Search feature.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-network-search.description"](): string;
    /**
      * `Database Full Width`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-database-full-width.name"](): string;
    /**
      * `The database will be displayed in full-width mode.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-database-full-width.description"](): string;
    /**
      * `Database Attachment Note`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-database-attachment-note.name"](): string;
    /**
      * `Allows adding notes to database attachments.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-database-attachment-note.description"](): string;
    /**
      * `Todo Block Query`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-block-query.name"](): string;
    /**
      * `Enables querying of todo blocks.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-block-query.description"](): string;
    /**
      * `Synced Doc Block`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-synced-doc-block.name"](): string;
    /**
      * `Enables syncing of doc blocks.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-synced-doc-block.description"](): string;
    /**
      * `Edgeless Text`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-edgeless-text.name"](): string;
    /**
      * `Enables edgeless text blocks.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-edgeless-text.description"](): string;
    /**
      * `Color Picker`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-color-picker.name"](): string;
    /**
      * `Enables color picker blocks.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-color-picker.description"](): string;
    /**
      * `AI Chat Block`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-chat-block.name"](): string;
    /**
      * `Enables AI chat blocks.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-chat-block.description"](): string;
    /**
      * `AI Onboarding`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-onboarding.name"](): string;
    /**
      * `Enables AI onboarding.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-ai-onboarding.description"](): string;
    /**
      * `Mind Map Import`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mind-map-import.name"](): string;
    /**
      * `Enables mind map import.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mind-map-import.description"](): string;
    /**
      * `Block Meta`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-block-meta.name"](): string;
    /**
      * `Once enabled, all blocks will have created time, updated time, created by and updated by.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-block-meta.description"](): string;
    /**
      * `Callout`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-callout.name"](): string;
    /**
      * `Let your words stand out. This also include the callout in the transcription block.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-callout.description"](): string;
    /**
      * `Embed Iframe Block`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-embed-iframe-block.name"](): string;
    /**
      * `Enables Embed Iframe Block.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-embed-iframe-block.description"](): string;
    /**
      * `Emoji Folder Icon`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-emoji-folder-icon.name"](): string;
    /**
      * `Once enabled, you can use an emoji as the folder icon. When the first character of the folder name is an emoji, it will be extracted and used as its icon.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-emoji-folder-icon.description"](): string;
    /**
      * `Emoji Doc Icon`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-emoji-doc-icon.name"](): string;
    /**
      * `Once enabled, you can use an emoji as the doc icon. When the first character of the doc name is an emoji, it will be extracted and used as its icon.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-emoji-doc-icon.description"](): string;
    /**
      * `Editor Settings`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-editor-settings.name"](): string;
    /**
      * `Enables editor settings.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-editor-settings.description"](): string;
    /**
      * `Theme Editor`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-theme-editor.name"](): string;
    /**
      * `Enables theme editor.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-theme-editor.description"](): string;
    /**
      * `Allow create local workspace`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-local-workspace.name"](): string;
    /**
      * `Allow create local workspace`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-local-workspace.description"](): string;
    /**
      * `Advanced block visibility control`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-advanced-block-visibility.name"](): string;
    /**
      * `To provide detailed control over which edgeless blocks are visible in page mode.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-advanced-block-visibility.description"](): string;
    /**
      * `Mobile Keyboard Toolbar`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-keyboard-toolbar.name"](): string;
    /**
      * `Enables the mobile keyboard toolbar.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-keyboard-toolbar.description"](): string;
    /**
      * `Mobile Linked Doc Widget`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-linked-doc-menu.name"](): string;
    /**
      * `Enables the mobile linked doc menu.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-linked-doc-menu.description"](): string;
    /**
      * `Enable Snapshot Import Export`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-snapshot-import-export.name"](): string;
    /**
      * `Once enabled, users can import and export blocksuite snapshots.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-snapshot-import-export.description"](): string;
    /**
      * `Multiple Cloud Servers`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-multiple-cloud-servers.name"](): string;
    /**
      * `Once enabled, users can connect to selfhosted cloud servers.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-multiple-cloud-servers.description"](): string;
    /**
      * `Enable Edgeless Editing`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-edgeless-editing.name"](): string;
    /**
      * `Once enabled, users can edit edgeless canvas.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-mobile-edgeless-editing.description"](): string;
    /**
      * `PDF embed preview`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-pdf-embed-preview.name"](): string;
    /**
      * `Once enabled, you can preview PDF in embed view.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-pdf-embed-preview.description"](): string;
    /**
      * `Audio block`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-audio-block.name"](): string;
    /**
      * `Audio block allows you to play audio files globally and add notes to them.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-audio-block.description"](): string;
    /**
      * `Meetings`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-meetings.name"](): string;
    /**
      * `Meetings allows you to record and transcribe meetings. Don't forget to enable it in BrightLoop settings.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-meetings.description"](): string;
    /**
      * `Editor RTL`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-editor-rtl.name"](): string;
    /**
      * `Once enabled, the editor will be displayed in RTL mode.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-editor-rtl.description"](): string;
    /**
      * `Edgeless scribbled style`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-edgeless-scribbled-style.name"](): string;
    /**
      * `Once enabled, you can use scribbled style in edgeless mode.`
      */
    ["com.BrightLoop.settings.workspace.experimental-features.enable-edgeless-scribbled-style.description"](): string;
    /**
      * `Only an owner can edit the workspace avatar and name. Changes will be shown for everyone.`
      */
    ["com.BrightLoop.settings.workspace.not-owner"](): string;
    /**
      * `Preference`
      */
    ["com.BrightLoop.settings.workspace.preferences"](): string;
    /**
      * `Team's Billing`
      */
    ["com.BrightLoop.settings.workspace.billing"](): string;
    /**
      * `Team Workspace`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace"](): string;
    /**
      * `Your workspace is in a free trail period.`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.description.free-trail"](): string;
    /**
      * `Your workspace is billed annually.`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.description.billed.annually"](): string;
    /**
      * `Your workspace is billed monthly.`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.description.billed.monthly"](): string;
    /**
      * `Your subscription will end on {{date}}`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.not-renewed"](options: {
        readonly date: string;
    }): string;
    /**
      * `Next billing date: {{date}}`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.next-billing-date"](options: {
        readonly date: string;
    }): string;
    /**
      * `Cancel Plan`
      */
    ["com.BrightLoop.settings.workspace.billing.team-workspace.cancel-plan"](): string;
    /**
      * `License`
      */
    ["com.BrightLoop.settings.workspace.license"](): string;
    /**
      * `Manage license information and invoices for the self host team workspace.`
      */
    ["com.BrightLoop.settings.workspace.license.description"](): string;
    /**
      * `Get teams plan for your self hosted workspace.`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.title"](): string;
    /**
      * `Need more seats? Best for scalable teams.`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.subtitle"](): string;
    /**
      * `Everything in Self Hosted FOSS`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g1"](): string;
    /**
      * `{{initialQuota}} initial storage + {{quotaPerSeat}} per seat`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g2"](options: Readonly<{
        initialQuota: string;
        quotaPerSeat: string;
    }>): string;
    /**
      * `{{quota}} of maximum file size`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g3"](options: {
        readonly quota: string;
    }): string;
    /**
      * `Unlimited team members (10+ seats)`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g4"](): string;
    /**
      * `Multiple admin roles`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g5"](): string;
    /**
      * `Priority customer support`
      */
    ["com.BrightLoop.settings.workspace.license.benefit.team.g6"](): string;
    /**
      * `Lean more`
      */
    ["com.BrightLoop.settings.workspace.license.lean-more"](): string;
    /**
      * `Selfhosted workspace`
      */
    ["com.BrightLoop.settings.workspace.license.self-host"](): string;
    /**
      * `Self-host Team Workspace`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team"](): string;
    /**
      * `This license will expire on {{expirationDate}}, with {{leftDays}} days remaining.`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team.team.description"](options: Readonly<{
        expirationDate: string;
        leftDays: string;
    }>): string;
    /**
      * `Basic version: {{memberCount}} seats. For more, purchase or use activation key.`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team.free.description"](options: {
        readonly memberCount: string;
    }): string;
    /**
      * `Seats`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team.seats"](): string;
    /**
      * `Active key`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team.active-key"](): string;
    /**
      * `Deactivate`
      */
    ["com.BrightLoop.settings.workspace.license.self-host-team.deactivate-license"](): string;
    /**
      * `Buy more seat`
      */
    ["com.BrightLoop.settings.workspace.license.buy-more-seat"](): string;
    /**
      * `Activate License`
      */
    ["com.BrightLoop.settings.workspace.license.activate-modal.title"](): string;
    /**
      * `Enter license key to activate this self host workspace.`
      */
    ["com.BrightLoop.settings.workspace.license.activate-modal.description"](): string;
    /**
      * `License activated successfully.`
      */
    ["com.BrightLoop.settings.workspace.license.activate-success"](): string;
    /**
      * `Deactivate License`
      */
    ["com.BrightLoop.settings.workspace.license.deactivate-modal.title"](): string;
    /**
      * `Are you sure you want to deactivate this license?`
      */
    ["com.BrightLoop.settings.workspace.license.deactivate-modal.description"](): string;
    /**
      * `License deactivated successfully.`
      */
    ["com.BrightLoop.settings.workspace.license.deactivate-success"](): string;
    /**
      * `Local`
      */
    ["com.BrightLoop.settings.workspace.state.local"](): string;
    /**
      * `Sync with BrightLoop Cloud`
      */
    ["com.BrightLoop.settings.workspace.state.sync-BrightLoop-cloud"](): string;
    /**
      * `Self-Hosted Server`
      */
    ["com.BrightLoop.settings.workspace.state.self-hosted"](): string;
    /**
      * `Joined Workspace`
      */
    ["com.BrightLoop.settings.workspace.state.joined"](): string;
    /**
      * `Available Offline`
      */
    ["com.BrightLoop.settings.workspace.state.available-offline"](): string;
    /**
      * `Published to Web`
      */
    ["com.BrightLoop.settings.workspace.state.published"](): string;
    /**
      * `Team Workspace`
      */
    ["com.BrightLoop.settings.workspace.state.team"](): string;
    /**
      * `Properties`
      */
    ["com.BrightLoop.settings.workspace.properties"](): string;
    /**
      * `Add property`
      */
    ["com.BrightLoop.settings.workspace.properties.add_property"](): string;
    /**
      * `All`
      */
    ["com.BrightLoop.settings.workspace.properties.all"](): string;
    /**
      * `Delete property`
      */
    ["com.BrightLoop.settings.workspace.properties.delete-property"](): string;
    /**
      * `Edit property`
      */
    ["com.BrightLoop.settings.workspace.properties.edit-property"](): string;
    /**
      * `General properties`
      */
    ["com.BrightLoop.settings.workspace.properties.general-properties"](): string;
    /**
      * `Properties`
      */
    ["com.BrightLoop.settings.workspace.properties.header.title"](): string;
    /**
      * `In use`
      */
    ["com.BrightLoop.settings.workspace.properties.in-use"](): string;
    /**
      * `Readonly properties`
      */
    ["com.BrightLoop.settings.workspace.properties.readonly-properties"](): string;
    /**
      * `Required properties`
      */
    ["com.BrightLoop.settings.workspace.properties.required-properties"](): string;
    /**
      * `Set as required property`
      */
    ["com.BrightLoop.settings.workspace.properties.set-as-required"](): string;
    /**
      * `Unused`
      */
    ["com.BrightLoop.settings.workspace.properties.unused"](): string;
    /**
      * `You can view current workspace's storage and files here.`
      */
    ["com.BrightLoop.settings.workspace.storage.subtitle"](): string;
    /**
      * `Enable BrightLoop Cloud to publish this workspace`
      */
    ["com.BrightLoop.settings.workspace.publish-tooltip"](): string;
    /**
      * `Sharing`
      */
    ["com.BrightLoop.settings.workspace.sharing.title"](): string;
    /**
      * `Allow URL unfurling by Slack & other social apps, even if a doc is only accessible by workspace members.`
      */
    ["com.BrightLoop.settings.workspace.sharing.url-preview.description"](): string;
    /**
      * `Always enable url preview`
      */
    ["com.BrightLoop.settings.workspace.sharing.url-preview.title"](): string;
    /**
      * `BrightLoop AI`
      */
    ["com.BrightLoop.settings.workspace.BrightLoop-ai.title"](): string;
    /**
      * `Allow BrightLoop AI Assistant`
      */
    ["com.BrightLoop.settings.workspace.BrightLoop-ai.label"](): string;
    /**
      * `Allow workspace members to use BrightLoop AI features. This setting doesn't affect billing. Workspace members use BrightLoop AI through their personal accounts.`
      */
    ["com.BrightLoop.settings.workspace.BrightLoop-ai.description"](): string;
    /**
      * `Archived workspaces`
      */
    ["com.BrightLoop.settings.workspace.backup"](): string;
    /**
      * `Manage archived local workspace files`
      */
    ["com.BrightLoop.settings.workspace.backup.subtitle"](): string;
    /**
      * `No archived workspace files found`
      */
    ["com.BrightLoop.settings.workspace.backup.empty"](): string;
    /**
      * `Delete archived workspace`
      */
    ["com.BrightLoop.settings.workspace.backup.delete"](): string;
    /**
      * `Are you sure you want to delete this workspace. This action cannot be undone. Make sure you no longer need them before proceeding.`
      */
    ["com.BrightLoop.settings.workspace.backup.delete.warning"](): string;
    /**
      * `Workspace backup deleted successfully`
      */
    ["com.BrightLoop.settings.workspace.backup.delete.success"](): string;
    /**
      * `Workspace enabled successfully`
      */
    ["com.BrightLoop.settings.workspace.backup.import.success"](): string;
    /**
      * `Enable local workspace`
      */
    ["com.BrightLoop.settings.workspace.backup.import"](): string;
    /**
      * `Open`
      */
    ["com.BrightLoop.settings.workspace.backup.import.success.action"](): string;
    /**
      * `Deleted on {{date}} at {{time}}`
      */
    ["com.BrightLoop.settings.workspace.backup.delete-at"](options: Readonly<{
        date: string;
        time: string;
    }>): string;
    /**
      * `Sharing doc requires BrightLoop Cloud.`
      */
    ["com.BrightLoop.share-menu.EnableCloudDescription"](): string;
    /**
      * `Share mode`
      */
    ["com.BrightLoop.share-menu.ShareMode"](): string;
    /**
      * `Share doc`
      */
    ["com.BrightLoop.share-menu.SharePage"](): string;
    /**
      * `General access`
      */
    ["com.BrightLoop.share-menu.generalAccess"](): string;
    /**
      * `Share via export`
      */
    ["com.BrightLoop.share-menu.ShareViaExport"](): string;
    /**
      * `Download a static copy of your doc to share with others`
      */
    ["com.BrightLoop.share-menu.ShareViaExportDescription"](): string;
    /**
      * `Print a paper copy`
      */
    ["com.BrightLoop.share-menu.ShareViaPrintDescription"](): string;
    /**
      * `Share with link`
      */
    ["com.BrightLoop.share-menu.ShareWithLink"](): string;
    /**
      * `Create a link you can easily share with anyone. The visitors will open your doc in the form od a document`
      */
    ["com.BrightLoop.share-menu.ShareWithLinkDescription"](): string;
    /**
      * `Shared doc`
      */
    ["com.BrightLoop.share-menu.SharedPage"](): string;
    /**
      * `Copy Link`
      */
    ["com.BrightLoop.share-menu.copy"](): string;
    /**
      * `Copy private link`
      */
    ["com.BrightLoop.share-menu.copy-private-link"](): string;
    /**
      * `Copy Link to Selected Block`
      */
    ["com.BrightLoop.share-menu.copy.block"](): string;
    /**
      * `Copy Link to Edgeless Mode`
      */
    ["com.BrightLoop.share-menu.copy.edgeless"](): string;
    /**
      * `Copy Link to Selected Frame`
      */
    ["com.BrightLoop.share-menu.copy.frame"](): string;
    /**
      * `Copy Link to Page Mode`
      */
    ["com.BrightLoop.share-menu.copy.page"](): string;
    /**
      * `You can share this document with link.`
      */
    ["com.BrightLoop.share-menu.create-public-link.notification.success.message"](): string;
    /**
      * `Public link created`
      */
    ["com.BrightLoop.share-menu.create-public-link.notification.success.title"](): string;
    /**
      * `Please try again later.`
      */
    ["com.BrightLoop.share-menu.disable-publish-link.notification.fail.message"](): string;
    /**
      * `Failed to disable public link`
      */
    ["com.BrightLoop.share-menu.disable-publish-link.notification.fail.title"](): string;
    /**
      * `This doc is no longer shared publicly.`
      */
    ["com.BrightLoop.share-menu.disable-publish-link.notification.success.message"](): string;
    /**
      * `Public link disabled`
      */
    ["com.BrightLoop.share-menu.disable-publish-link.notification.success.title"](): string;
    /**
      * `Manage workspace members`
      */
    ["com.BrightLoop.share-menu.navigate.workspace"](): string;
    /**
      * `Anyone with the link`
      */
    ["com.BrightLoop.share-menu.option.link.label"](): string;
    /**
      * `No access`
      */
    ["com.BrightLoop.share-menu.option.link.no-access"](): string;
    /**
      * `Only workspace members can access this link`
      */
    ["com.BrightLoop.share-menu.option.link.no-access.description"](): string;
    /**
      * `Read only`
      */
    ["com.BrightLoop.share-menu.option.link.readonly"](): string;
    /**
      * `Anyone can access this link`
      */
    ["com.BrightLoop.share-menu.option.link.readonly.description"](): string;
    /**
      * `Can manage`
      */
    ["com.BrightLoop.share-menu.option.permission.can-manage"](): string;
    /**
      * `Can edit`
      */
    ["com.BrightLoop.share-menu.option.permission.can-edit"](): string;
    /**
      * `Can read`
      */
    ["com.BrightLoop.share-menu.option.permission.can-read"](): string;
    /**
      * `No access`
      */
    ["com.BrightLoop.share-menu.option.permission.no-access"](): string;
    /**
      * `Members in workspace`
      */
    ["com.BrightLoop.share-menu.option.permission.label"](): string;
    /**
      * `Workspace admins and owner automatically have Can manage permissions.`
      */
    ["com.BrightLoop.share-menu.option.permission.tips"](): string;
    /**
      * `Publish to web`
      */
    ["com.BrightLoop.share-menu.publish-to-web"](): string;
    /**
      * `Share privately`
      */
    ["com.BrightLoop.share-menu.share-privately"](): string;
    /**
      * `Share`
      */
    ["com.BrightLoop.share-menu.shareButton"](): string;
    /**
      * `Shared`
      */
    ["com.BrightLoop.share-menu.sharedButton"](): string;
    /**
      * `{{member1}} and {{member2}} are in this doc`
      */
    ["com.BrightLoop.share-menu.member-management.member-count-2"](options: Readonly<{
        member1: string;
        member2: string;
    }>): string;
    /**
      * `{{member1}}, {{member2}} and {{member3}} are in this doc`
      */
    ["com.BrightLoop.share-menu.member-management.member-count-3"](options: Readonly<{
        member1: string;
        member2: string;
        member3: string;
    }>): string;
    /**
      * `{{member1}}, {{member2}} and {{memberCount}} others`
      */
    ["com.BrightLoop.share-menu.member-management.member-count-more"](options: Readonly<{
        member1: string;
        member2: string;
        memberCount: string;
    }>): string;
    /**
      * `Remove`
      */
    ["com.BrightLoop.share-menu.member-management.remove"](): string;
    /**
      * `Set as owner`
      */
    ["com.BrightLoop.share-menu.member-management.set-as-owner"](): string;
    /**
      * `Make this person the owner?`
      */
    ["com.BrightLoop.share-menu.member-management.set-as-owner.confirm.title"](): string;
    /**
      * `The new owner will be effective immediately, and you might lose access to this doc if other users remove you, please confirm.`
      */
    ["com.BrightLoop.share-menu.member-management.set-as-owner.confirm.description"](): string;
    /**
      * `Permission updated`
      */
    ["com.BrightLoop.share-menu.member-management.update-success"](): string;
    /**
      * `Failed to update permission`
      */
    ["com.BrightLoop.share-menu.member-management.update-fail"](): string;
    /**
      * `{{memberCount}} collaborators in the doc`
      */
    ["com.BrightLoop.share-menu.member-management.header"](options: {
        readonly memberCount: string;
    }): string;
    /**
      * `Add collaborators`
      */
    ["com.BrightLoop.share-menu.member-management.add-collaborators"](): string;
    /**
      * `Send invite`
      */
    ["com.BrightLoop.share-menu.invite-editor.header"](): string;
    /**
      * `Manage members`
      */
    ["com.BrightLoop.share-menu.invite-editor.manage-members"](): string;
    /**
      * `Invite`
      */
    ["com.BrightLoop.share-menu.invite-editor.invite"](): string;
    /**
      * `No results found`
      */
    ["com.BrightLoop.share-menu.invite-editor.no-found"](): string;
    /**
      * `Invite other members`
      */
    ["com.BrightLoop.share-menu.invite-editor.placeholder"](): string;
    /**
      * `Notify via Email`
      */
    ["com.BrightLoop.share-menu.invite-editor.sent-email"](): string;
    /**
      * `Permission not available in Free plan`
      */
    ["com.BrightLoop.share-menu.paywall.owner.title"](): string;
    /**
      * `Upgrade to Pro or higher to unlock permission settings for this doc.`
      */
    ["com.BrightLoop.share-menu.paywall.owner.description"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.share-menu.paywall.owner.confirm"](): string;
    /**
      * `Permission requires a workspace upgrade`
      */
    ["com.BrightLoop.share-menu.paywall.member.title"](): string;
    /**
      * `Ask your workspace owner to upgrade to Pro or higher to enable permissions.`
      */
    ["com.BrightLoop.share-menu.paywall.member.description"](): string;
    /**
      * `Got it`
      */
    ["com.BrightLoop.share-menu.paywall.member.confirm"](): string;
    /**
      * `Built with`
      */
    ["com.BrightLoop.share-page.footer.built-with"](): string;
    /**
      * `Create with`
      */
    ["com.BrightLoop.share-page.footer.create-with"](): string;
    /**
      * `Empower your sharing with BrightLoop Cloud: One-click doc sharing`
      */
    ["com.BrightLoop.share-page.footer.description"](): string;
    /**
      * `Get started for free`
      */
    ["com.BrightLoop.share-page.footer.get-started"](): string;
    /**
      * `Use This Template`
      */
    ["com.BrightLoop.share-page.header.import-template"](): string;
    /**
      * `Login or Sign Up`
      */
    ["com.BrightLoop.share-page.header.login"](): string;
    /**
      * `Present`
      */
    ["com.BrightLoop.share-page.header.present"](): string;
    /**
      * `Edgeless`
      */
    ["com.BrightLoop.shortcutsTitle.edgeless"](): string;
    /**
      * `General`
      */
    ["com.BrightLoop.shortcutsTitle.general"](): string;
    /**
      * `Markdown syntax`
      */
    ["com.BrightLoop.shortcutsTitle.markdownSyntax"](): string;
    /**
      * `Page`
      */
    ["com.BrightLoop.shortcutsTitle.page"](): string;
    /**
      * `Collapse sidebar`
      */
    ["com.BrightLoop.sidebarSwitch.collapse"](): string;
    /**
      * `Expand sidebar`
      */
    ["com.BrightLoop.sidebarSwitch.expand"](): string;
    /**
      * `Snapshot Imp. & Exp.`
      */
    ["com.BrightLoop.snapshot.import-export.enable"](): string;
    /**
      * `Once enabled you can find the Snapshot Export Import option in the document's More menu.`
      */
    ["com.BrightLoop.snapshot.import-export.enable.desc"](): string;
    /**
      * `Maybe later`
      */
    ["com.BrightLoop.star-BrightLoop.cancel"](): string;
    /**
      * `Star on GitHub`
      */
    ["com.BrightLoop.star-BrightLoop.confirm"](): string;
    /**
      * `Are you finding our app useful and enjoyable? We'd love your support to keep improving! A great way to help us out is by giving us a star on GitHub. This simple action can make a big difference and helps us continue to deliver the best experience for you.`
      */
    ["com.BrightLoop.star-BrightLoop.description"](): string;
    /**
      * `Star us on GitHub`
      */
    ["com.BrightLoop.star-BrightLoop.title"](): string;
    /**
      * `Change plan`
      */
    ["com.BrightLoop.storage.change-plan"](): string;
    /**
      * `You have reached the maximum capacity limit for your current account`
      */
    ["com.BrightLoop.storage.maximum-tips"](): string;
    /**
      * `Pro users will have unlimited storage capacity during the alpha test period of the team version`
      */
    ["com.BrightLoop.storage.maximum-tips.pro"](): string;
    /**
      * `Plan`
      */
    ["com.BrightLoop.storage.plan"](): string;
    /**
      * `BrightLoop Cloud storage`
      */
    ["com.BrightLoop.storage.title"](): string;
    /**
      * `Upgrade`
      */
    ["com.BrightLoop.storage.upgrade"](): string;
    /**
      * `Space used`
      */
    ["com.BrightLoop.storage.used.hint"](): string;
    /**
      * `Syncing`
      */
    ["com.BrightLoop.syncing"](): string;
    /**
      * `{{count}} doc`
    
      * - com.BrightLoop.tags.count_one: `{{count}} doc`
    
      * - com.BrightLoop.tags.count_other: `{{count}} docs`
    
      * - com.BrightLoop.tags.count_zero: `{{count}} doc`
      */
    ["com.BrightLoop.tags.count"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `{{count}} doc`
      */
    ["com.BrightLoop.tags.count_one"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `{{count}} docs`
      */
    ["com.BrightLoop.tags.count_other"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `{{count}} doc`
      */
    ["com.BrightLoop.tags.count_zero"](options: {
        readonly count: string | number | bigint;
    }): string;
    /**
      * `Type tag name here...`
      */
    ["com.BrightLoop.tags.create-tag.placeholder"](): string;
    /**
      * `Tag already exists`
      */
    ["com.BrightLoop.tags.create-tag.toast.exist"](): string;
    /**
      * `Tag created`
      */
    ["com.BrightLoop.tags.create-tag.toast.success"](): string;
    /**
      * `Tag deleted`
      */
    ["com.BrightLoop.tags.delete-tags.toast"](): string;
    /**
      * `Tag updated`
      */
    ["com.BrightLoop.tags.edit-tag.toast.success"](): string;
    /**
      * `New tag`
      */
    ["com.BrightLoop.tags.empty.new-tag-button"](): string;
    /**
      * `Enable telemetry`
      */
    ["com.BrightLoop.telemetry.enable"](): string;
    /**
      * `Telemetry is a feature that allows us to collect data on how you use the app. This data helps us improve the app and provide better features.`
      */
    ["com.BrightLoop.telemetry.enable.desc"](): string;
    /**
      * `Dark`
      */
    ["com.BrightLoop.themeSettings.dark"](): string;
    /**
      * `Light`
      */
    ["com.BrightLoop.themeSettings.light"](): string;
    /**
      * `System`
      */
    ["com.BrightLoop.themeSettings.system"](): string;
    /**
      * `Auto`
      */
    ["com.BrightLoop.themeSettings.auto"](): string;
    /**
      * `now`
      */
    ["com.BrightLoop.time.now"](): string;
    /**
      * `this month`
      */
    ["com.BrightLoop.time.this-mouth"](): string;
    /**
      * `this week`
      */
    ["com.BrightLoop.time.this-week"](): string;
    /**
      * `this year`
      */
    ["com.BrightLoop.time.this-year"](): string;
    /**
      * `today`
      */
    ["com.BrightLoop.time.today"](): string;
    /**
      * `Successfully added linked doc`
      */
    ["com.BrightLoop.toastMessage.addLinkedPage"](): string;
    /**
      * `Added to favorites`
      */
    ["com.BrightLoop.toastMessage.addedFavorites"](): string;
    /**
      * `Edgeless mode`
      */
    ["com.BrightLoop.toastMessage.edgelessMode"](): string;
    /**
      * `Moved to trash`
      */
    ["com.BrightLoop.toastMessage.movedTrash"](): string;
    /**
      * `Page Mode`
      */
    ["com.BrightLoop.toastMessage.pageMode"](): string;
    /**
      * `Default mode has changed`
      */
    ["com.BrightLoop.toastMessage.defaultMode.page.title"](): string;
    /**
      * `The default mode for this document has been changed to Page mode`
      */
    ["com.BrightLoop.toastMessage.defaultMode.page.message"](): string;
    /**
      * `Default mode has changed`
      */
    ["com.BrightLoop.toastMessage.defaultMode.edgeless.title"](): string;
    /**
      * `The default mode for this document has been changed to Edgeless mode`
      */
    ["com.BrightLoop.toastMessage.defaultMode.edgeless.message"](): string;
    /**
      * `Permanently deleted`
      */
    ["com.BrightLoop.toastMessage.permanentlyDeleted"](): string;
    /**
      * `Removed from favourites`
      */
    ["com.BrightLoop.toastMessage.removedFavorites"](): string;
    /**
      * `Successfully renamed`
      */
    ["com.BrightLoop.toastMessage.rename"](): string;
    /**
      * `{{title}} restored`
      */
    ["com.BrightLoop.toastMessage.restored"](options: {
        readonly title: string;
    }): string;
    /**
      * `Successfully deleted`
      */
    ["com.BrightLoop.toastMessage.successfullyDeleted"](): string;
    /**
      * `Today`
      */
    ["com.BrightLoop.today"](): string;
    /**
      * `Tomorrow`
      */
    ["com.BrightLoop.tomorrow"](): string;
    /**
      * `Last {{weekday}}`
      */
    ["com.BrightLoop.last-week"](options: {
        readonly weekday: string;
    }): string;
    /**
      * `Next {{weekday}}`
      */
    ["com.BrightLoop.next-week"](options: {
        readonly weekday: string;
    }): string;
    /**
      * `Limited to view-only on mobile.`
      */
    ["com.BrightLoop.top-tip.mobile"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.trashOperation.delete"](): string;
    /**
      * `Once deleted, you can't undo this action. Do you confirm?`
      */
    ["com.BrightLoop.trashOperation.delete.description"](): string;
    /**
      * `Permanently delete`
      */
    ["com.BrightLoop.trashOperation.delete.title"](): string;
    /**
      * `Once deleted, you can't undo this action. Do you confirm?`
      */
    ["com.BrightLoop.trashOperation.deleteDescription"](): string;
    /**
      * `Delete permanently`
      */
    ["com.BrightLoop.trashOperation.deletePermanently"](): string;
    /**
      * `Restore it`
      */
    ["com.BrightLoop.trashOperation.restoreIt"](): string;
    /**
      * `Refresh current page`
      */
    ["com.BrightLoop.upgrade.button-text.done"](): string;
    /**
      * `Data upgrade error`
      */
    ["com.BrightLoop.upgrade.button-text.error"](): string;
    /**
      * `Upgrade workspace data`
      */
    ["com.BrightLoop.upgrade.button-text.pending"](): string;
    /**
      * `Upgrading`
      */
    ["com.BrightLoop.upgrade.button-text.upgrading"](): string;
    /**
      * `After upgrading the workspace data, please refresh the page to see the changes.`
      */
    ["com.BrightLoop.upgrade.tips.done"](): string;
    /**
      * `We encountered some errors while upgrading the workspace data.`
      */
    ["com.BrightLoop.upgrade.tips.error"](): string;
    /**
      * `To ensure compatibility with the updated BrightLoop client, please upgrade your data by clicking the "Upgrade workspace data" button below.`
      */
    ["com.BrightLoop.upgrade.tips.normal"](): string;
    /**
      * `AI usage`
      */
    ["com.BrightLoop.user-info.usage.ai"](): string;
    /**
      * `Cloud storage`
      */
    ["com.BrightLoop.user-info.usage.cloud"](): string;
    /**
      * `Close`
      */
    ["com.BrightLoop.workbench.split-view-menu.close"](): string;
    /**
      * `Full screen`
      */
    ["com.BrightLoop.workbench.split-view-menu.full-screen"](): string;
    /**
      * `Solo view`
      */
    ["com.BrightLoop.workbench.split-view-menu.keep-this-one"](): string;
    /**
      * `Move left`
      */
    ["com.BrightLoop.workbench.split-view-menu.move-left"](): string;
    /**
      * `Move right`
      */
    ["com.BrightLoop.workbench.split-view-menu.move-right"](): string;
    /**
      * `Open in split view`
      */
    ["com.BrightLoop.workbench.split-view.page-menu-open"](): string;
    /**
      * `Open in new tab`
      */
    ["com.BrightLoop.workbench.tab.page-menu-open"](): string;
    /**
      * `You cannot delete the last workspace`
      */
    ["com.BrightLoop.workspace.cannot-delete"](): string;
    /**
      * `Cloud workspaces`
      */
    ["com.BrightLoop.workspace.cloud"](): string;
    /**
      * `Sign out`
      */
    ["com.BrightLoop.workspace.cloud.account.logout"](): string;
    /**
      * `Account settings`
      */
    ["com.BrightLoop.workspace.cloud.account.settings"](): string;
    /**
      * `Admin panel`
      */
    ["com.BrightLoop.workspace.cloud.account.admin"](): string;
    /**
      * `Sign up/ Sign in`
      */
    ["com.BrightLoop.workspace.cloud.auth"](): string;
    /**
      * `Sync with BrightLoop Cloud`
      */
    ["com.BrightLoop.workspace.cloud.description"](): string;
    /**
      * `Join workspace`
      */
    ["com.BrightLoop.workspace.cloud.join"](): string;
    /**
      * `Cloud sync`
      */
    ["com.BrightLoop.workspace.cloud.sync"](): string;
    /**
      * `Failed to enable Cloud, please try again.`
      */
    ["com.BrightLoop.workspace.enable-cloud.failed"](): string;
    /**
      * `Local workspaces`
      */
    ["com.BrightLoop.workspace.local"](): string;
    /**
      * `Import workspace`
      */
    ["com.BrightLoop.workspace.local.import"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.workspaceDelete.button.cancel"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.workspaceDelete.button.delete"](): string;
    /**
      * `Please type workspace name to confirm`
      */
    ["com.BrightLoop.workspaceDelete.placeholder"](): string;
    /**
      * `Delete workspace`
      */
    ["com.BrightLoop.workspaceDelete.title"](): string;
    /**
      * `Create workspace`
      */
    ["com.BrightLoop.workspaceList.addWorkspace.create"](): string;
    /**
      * `Create cloud workspace`
      */
    ["com.BrightLoop.workspaceList.addWorkspace.create-cloud"](): string;
    /**
      * `Cloud sync`
      */
    ["com.BrightLoop.workspaceList.workspaceListType.cloud"](): string;
    /**
      * `Local storage`
      */
    ["com.BrightLoop.workspaceList.workspaceListType.local"](): string;
    /**
      * `Add Server`
      */
    ["com.BrightLoop.workspaceList.addServer"](): string;
    /**
      * `All docs`
      */
    ["com.BrightLoop.workspaceSubPath.all"](): string;
    /**
      * `Trash`
      */
    ["com.BrightLoop.workspaceSubPath.trash"](): string;
    /**
      * `Deleted docs will appear here.`
      */
    ["com.BrightLoop.workspaceSubPath.trash.empty-description"](): string;
    /**
      * `Write with a blank page`
      */
    ["com.BrightLoop.write_with_a_blank_page"](): string;
    /**
      * `Yesterday`
      */
    ["com.BrightLoop.yesterday"](): string;
    /**
      * `Inactive`
      */
    ["com.BrightLoop.inactive"](): string;
    /**
      * `Inactive member`
      */
    ["com.BrightLoop.inactive-member"](): string;
    /**
      * `Inactive workspace`
      */
    ["com.BrightLoop.inactive-workspace"](): string;
    /**
      * `core`
      */
    core(): string;
    /**
      * `Dark`
      */
    dark(): string;
    /**
      * `invited you to join`
      */
    ["invited you to join"](): string;
    /**
      * `Light`
      */
    light(): string;
    /**
      * `Others`
      */
    others(): string;
    /**
      * `System`
      */
    system(): string;
    /**
      * `unnamed`
      */
    unnamed(): string;
    /**
      * `Please upgrade to the latest version of Chrome for the best experience.`
      */
    upgradeBrowser(): string;
    /**
      * `Workspace properties`
      */
    ["com.BrightLoop.workspace.properties"](): string;
    /**
      * `Rename to "{{name}}"`
      */
    ["com.BrightLoop.m.rename-to"](options: {
        readonly name: string;
    }): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.m.explorer.folder.rename"](): string;
    /**
      * `Create Folder`
      */
    ["com.BrightLoop.m.explorer.folder.new-dialog-title"](): string;
    /**
      * `Organize`
      */
    ["com.BrightLoop.m.explorer.folder.root"](): string;
    /**
      * `Create a folder in the {{parent}}.`
      */
    ["com.BrightLoop.m.explorer.folder.new-tip-empty"](options: {
        readonly parent: string;
    }): string;
    /**
      * `Create "{{value}}" in the {{parent}}.`
      */
    ["com.BrightLoop.m.explorer.folder.new-tip-not-empty"](options: Readonly<{
        value: string;
        parent: string;
    }>): string;
    /**
      * `Done`
      */
    ["com.BrightLoop.m.explorer.folder.rename-confirm"](): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.m.explorer.tag.rename"](): string;
    /**
      * `Rename Tag`
      */
    ["com.BrightLoop.m.explorer.tag.rename-menu-title"](): string;
    /**
      * `Create Tag`
      */
    ["com.BrightLoop.m.explorer.tag.new-dialog-title"](): string;
    /**
      * `Done`
      */
    ["com.BrightLoop.m.explorer.tag.rename-confirm"](): string;
    /**
      * `Create a tag in this workspace.`
      */
    ["com.BrightLoop.m.explorer.tag.new-tip-empty"](): string;
    /**
      * `Create "{{value}}" tag in this workspace.`
      */
    ["com.BrightLoop.m.explorer.tag.new-tip-not-empty"](options: {
        readonly value: string;
    }): string;
    /**
      * `Manage Doc(s)`
      */
    ["com.BrightLoop.m.explorer.tag.manage-docs"](): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.m.explorer.collection.rename"](): string;
    /**
      * `Rename Collection`
      */
    ["com.BrightLoop.m.explorer.collection.rename-menu-title"](): string;
    /**
      * `Create Collection`
      */
    ["com.BrightLoop.m.explorer.collection.new-dialog-title"](): string;
    /**
      * `Rename`
      */
    ["com.BrightLoop.m.explorer.doc.rename"](): string;
    /**
      * `Doc`
      */
    ["com.BrightLoop.m.selector.type-doc"](): string;
    /**
      * `Tag`
      */
    ["com.BrightLoop.m.selector.type-tag"](): string;
    /**
      * `Collection`
      */
    ["com.BrightLoop.m.selector.type-collection"](): string;
    /**
      * `Folder`
      */
    ["com.BrightLoop.m.selector.where-folder"](): string;
    /**
      * `Tag`
      */
    ["com.BrightLoop.m.selector.where-tag"](): string;
    /**
      * `Collection`
      */
    ["com.BrightLoop.m.selector.where-collection"](): string;
    /**
      * `Apply`
      */
    ["com.BrightLoop.m.selector.confirm-default"](): string;
    /**
      * `Manage {{type}}(s)`
      */
    ["com.BrightLoop.m.selector.title"](options: {
        readonly type: string;
    }): string;
    /**
      * `{{total}} item(s)`
      */
    ["com.BrightLoop.m.selector.info-total"](options: {
        readonly total: string;
    }): string;
    /**
      * `Add {{count}} {{type}}(s)`
      */
    ["com.BrightLoop.m.selector.info-added"](options: Readonly<{
        count: string;
        type: string;
    }>): string;
    /**
      * `Remove {{count}} {{type}}(s)`
      */
    ["com.BrightLoop.m.selector.info-removed"](options: Readonly<{
        count: string;
        type: string;
    }>): string;
    /**
      * `Remove items`
      */
    ["com.BrightLoop.m.selector.remove-warning.title"](): string;
    /**
      * `You unchecked {{type}} that already exist in the current {{where}}, which means you will remove them from this {{where}}. The item will not be deleted.`
      */
    ["com.BrightLoop.m.selector.remove-warning.message"](options: Readonly<{
        type: string;
        where: string;
    }>): string;
    /**
      * `Do not ask again`
      */
    ["com.BrightLoop.m.selector.remove-warning.confirm"](): string;
    /**
      * `Cancel`
      */
    ["com.BrightLoop.m.selector.remove-warning.cancel"](): string;
    /**
      * `tag`
      */
    ["com.BrightLoop.m.selector.remove-warning.where-tag"](): string;
    /**
      * `folder`
      */
    ["com.BrightLoop.m.selector.remove-warning.where-folder"](): string;
    /**
      * `Today's activity`
      */
    ["com.BrightLoop.m.selector.journal-menu.today-activity"](): string;
    /**
      * `Duplicate Entries in Today's Journal`
      */
    ["com.BrightLoop.m.selector.journal-menu.conflicts"](): string;
    /**
      * `Unable to preview this file`
      */
    ["com.BrightLoop.attachment.preview.error.title"](): string;
    /**
      * `file type not supported.`
      */
    ["com.BrightLoop.attachment.preview.error.subtitle"](): string;
    /**
      * `Failed to render page.`
      */
    ["com.BrightLoop.pdf.page.render.error"](): string;
    /**
      * `Duplicate Entries in Today's Journal`
      */
    ["com.BrightLoop.editor.journal-conflict.title"](): string;
    /**
      * `Search for "{{query}}"`
      */
    ["com.BrightLoop.editor.at-menu.link-to-doc"](options: {
        readonly query: string;
    }): string;
    /**
      * `Recent`
      */
    ["com.BrightLoop.editor.at-menu.recent-docs"](): string;
    /**
      * `Tags`
      */
    ["com.BrightLoop.editor.at-menu.tags"](): string;
    /**
      * `Collections`
      */
    ["com.BrightLoop.editor.at-menu.collections"](): string;
    /**
      * `Loading...`
      */
    ["com.BrightLoop.editor.at-menu.loading"](): string;
    /**
      * `New`
      */
    ["com.BrightLoop.editor.at-menu.new-doc"](): string;
    /**
      * `New "{{name}}" page`
      */
    ["com.BrightLoop.editor.at-menu.create-page"](options: {
        readonly name: string;
    }): string;
    /**
      * `New "{{name}}" edgeless`
      */
    ["com.BrightLoop.editor.at-menu.create-edgeless"](options: {
        readonly name: string;
    }): string;
    /**
      * `Import`
      */
    ["com.BrightLoop.editor.at-menu.import"](): string;
    /**
      * `{{count}} more docs`
      */
    ["com.BrightLoop.editor.at-menu.more-docs-hint"](options: {
        readonly count: string;
    }): string;
    /**
      * `Journal`
      */
    ["com.BrightLoop.editor.at-menu.journal"](): string;
    /**
      * `Select a specific date`
      */
    ["com.BrightLoop.editor.at-menu.date-picker"](): string;
    /**
      * `Mention Members`
      */
    ["com.BrightLoop.editor.at-menu.mention-members"](): string;
    /**
      * `Member not notified`
      */
    ["com.BrightLoop.editor.at-menu.member-not-notified"](): string;
    /**
      * `This member does not have access to this doc, they are not notified.`
      */
    ["com.BrightLoop.editor.at-menu.member-not-notified-message"](): string;
    /**
      * `Invited and notified`
      */
    ["com.BrightLoop.editor.at-menu.invited-and-notified"](): string;
    /**
      * `Access needed`
      */
    ["com.BrightLoop.editor.at-menu.access-needed"](): string;
    /**
      * `{{username}} does not have access to this doc, do you want to invite and notify them?`
      */
    ["com.BrightLoop.editor.at-menu.access-needed-message"](options: {
        readonly username: string;
    }): string;
    /**
      * `Show`
      */
    ["com.BrightLoop.editor.bi-directional-link-panel.show"](): string;
    /**
      * `Hide`
      */
    ["com.BrightLoop.editor.bi-directional-link-panel.hide"](): string;
    /**
      * `Fold page block`
      */
    ["com.BrightLoop.editor.edgeless-note-header.fold-page-block"](): string;
    /**
      * `View in page`
      */
    ["com.BrightLoop.editor.edgeless-note-header.view-in-page"](): string;
    /**
      * `Empower Your Team with Seamless Collaboration`
      */
    ["com.BrightLoop.upgrade-to-team-page.title"](): string;
    /**
      * `Select an existing workspace or create a new one`
      */
    ["com.BrightLoop.upgrade-to-team-page.workspace-selector.placeholder"](): string;
    /**
      * `Create Workspace`
      */
    ["com.BrightLoop.upgrade-to-team-page.workspace-selector.create-workspace"](): string;
    /**
      * `Upgrade to Team Workspace`
      */
    ["com.BrightLoop.upgrade-to-team-page.upgrade-button"](): string;
    /**
      * `Team Workspace gives you everything you need for seamless team collaboration:`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.title"](): string;
    /**
      * `Invite unlimited members to your workspace`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.g1"](): string;
    /**
      * `Set custom roles and permissions for better control`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.g2"](): string;
    /**
      * `Access advanced team management features`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.g3"](): string;
    /**
      * `Get priority customer support`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.g4"](): string;
    /**
      * `Perfect for growing teams and organizations that need professional collaboration tools.`
      */
    ["com.BrightLoop.upgrade-to-team-page.benefit.description"](): string;
    /**
      * `Upgrade to Team Workspace`
      */
    ["com.BrightLoop.upgrade-to-team-page.upgrade-confirm.title"](): string;
    /**
      * `Name Your Workspace`
      */
    ["com.BrightLoop.upgrade-to-team-page.create-and-upgrade-confirm.title"](): string;
    /**
      * `A workspace is your virtual space to capture, create and plan as just one person or together as a team.`
      */
    ["com.BrightLoop.upgrade-to-team-page.create-and-upgrade-confirm.description"](): string;
    /**
      * `Set a workspace name`
      */
    ["com.BrightLoop.upgrade-to-team-page.create-and-upgrade-confirm.placeholder"](): string;
    /**
      * `Continue to Pricing`
      */
    ["com.BrightLoop.upgrade-to-team-page.create-and-upgrade-confirm.confirm"](): string;
    /**
      * `No workspace available`
      */
    ["com.BrightLoop.upgrade-to-team-page.no-workspace-available"](): string;
    /**
      * `Workspace storage`
      */
    ["com.BrightLoop.workspace.storage"](): string;
    /**
      * `Journal`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.journal"](): string;
    /**
      * `Select a specific date`
      */
    ["com.BrightLoop.cmdk.BrightLoop.category.BrightLoop.date-picker"](): string;
    /**
      * `Workspace sync paused`
      */
    ["com.BrightLoop.payment.sync-paused.title"](): string;
    /**
      * `Your workspace has exceeded both storage and member limits, causing synchronization to pause. To resume syncing, please either:`
      */
    ["com.BrightLoop.payment.sync-paused.owner.both.description"](): string;
    /**
      * `Reduce storage usage and remove some team members`
      */
    ["com.BrightLoop.payment.sync-paused.owner.both.tips-1"](): string;
    /**
      * `Upgrade your plan for increased capacity`
      */
    ["com.BrightLoop.payment.sync-paused.owner.both.tips-2"](): string;
    /**
      * `Your workspace has exceeded its storage limit and synchronization has been paused. To resume syncing, please either:`
      */
    ["com.BrightLoop.payment.sync-paused.owner.storage.description"](): string;
    /**
      * `Remove unnecessary files or content to reduce storage usage`
      */
    ["com.BrightLoop.payment.sync-paused.owner.storage.tips-1"](): string;
    /**
      * `Upgrade your plan for increased storage capacity`
      */
    ["com.BrightLoop.payment.sync-paused.owner.storage.tips-2"](): string;
    /**
      * `Your workspace has reached its maximum member capacity and synchronization has been paused. To resume syncing, you can either`
      */
    ["com.BrightLoop.payment.sync-paused.owner.member.description"](): string;
    /**
      * `Remove some team members from the workspace`
      */
    ["com.BrightLoop.payment.sync-paused.owner.member.tips-1"](): string;
    /**
      * `Upgrade your plan to accommodate more members`
      */
    ["com.BrightLoop.payment.sync-paused.owner.member.tips-2"](): string;
    /**
      * `This workspace has exceeded both storage and member limits, causing synchronization to pause. Please contact your workspace owner to address these limits and resume syncing.`
      */
    ["com.BrightLoop.payment.sync-paused.member.both.description"](): string;
    /**
      * `This workspace has exceeded its storage limit and synchronization has been paused. Please contact your workspace owner to either reduce storage usage or upgrade the plan to resume syncing.`
      */
    ["com.BrightLoop.payment.sync-paused.member.storage.description"](): string;
    /**
      * `This workspace has reached its maximum member capacity and synchronization has been paused. Please contact your workspace owner to either adjust team membership or upgrade the plan to resume syncing.`
      */
    ["com.BrightLoop.payment.sync-paused.member.member.description"](): string;
    /**
      * `Got It`
      */
    ["com.BrightLoop.payment.sync-paused.member.member.confirm"](): string;
    /**
      * `Delete Server`
      */
    ["com.BrightLoop.server.delete"](): string;
    /**
      * `Start`
      */
    ["com.BrightLoop.page-starter-bar.start"](): string;
    /**
      * `Template`
      */
    ["com.BrightLoop.page-starter-bar.template"](): string;
    /**
      * `With AI`
      */
    ["com.BrightLoop.page-starter-bar.ai"](): string;
    /**
      * `Edgeless`
      */
    ["com.BrightLoop.page-starter-bar.edgeless"](): string;
    /**
      * `Unsupported message`
      */
    ["com.BrightLoop.notification.unsupported"](): string;
    /**
      * `No new notifications`
      */
    ["com.BrightLoop.notification.empty"](): string;
    /**
      * `Loading more...`
      */
    ["com.BrightLoop.notification.loading-more"](): string;
    /**
      * `You'll be notified here for @mentions and workspace invites.`
      */
    ["com.BrightLoop.notification.empty.description"](): string;
    /**
      * `Open workspace`
      */
    ["com.BrightLoop.notification.invitation-review-approved.open-workspace"](): string;
    /**
      * `Accept & Join`
      */
    ["com.BrightLoop.notification.invitation.accept"](): string;
    /**
      * `Tips`
      */
    tips(): string;
    /**
      * `Template`
      */
    Template(): string;
    /**
      * `Delete Template`
      */
    ["com.BrightLoop.template-list.delete"](): string;
    /**
      * `No template`
      */
    ["com.BrightLoop.template-list.empty"](): string;
    /**
      * `Create new template`
      */
    ["com.BrightLoop.template-list.create-new"](): string;
    /**
      * `Set a Template for the Journal`
      */
    ["com.BrightLoop.template-journal-onboarding.title"](): string;
    /**
      * `Select`
      */
    ["com.BrightLoop.template-journal-onboarding.select"](): string;
    /**
      * `My Templates`
      */
    ["com.BrightLoop.settings.workspace.template.title"](): string;
    /**
      * `Template for journal`
      */
    ["com.BrightLoop.settings.workspace.template.journal"](): string;
    /**
      * `Select a template for your journal`
      */
    ["com.BrightLoop.settings.workspace.template.journal-desc"](): string;
    /**
      * `Keep empty`
      */
    ["com.BrightLoop.settings.workspace.template.keep-empty"](): string;
    /**
      * `New doc with template`
      */
    ["com.BrightLoop.settings.workspace.template.page"](): string;
    /**
      * `New docs will use the specified template, ignoring default settings.`
      */
    ["com.BrightLoop.settings.workspace.template.page-desc"](): string;
    /**
      * `Template for new doc`
      */
    ["com.BrightLoop.settings.workspace.template.page-select"](): string;
    /**
      * `Remove template`
      */
    ["com.BrightLoop.settings.workspace.template.remove"](): string;
    /**
      * `You don't have permission to do this`
      */
    ["com.BrightLoop.no-permission"](): string;
    /**
      * `Unused blobs`
      */
    ["com.BrightLoop.settings.workspace.storage.unused-blobs"](): string;
    /**
      * `No unused blobs`
      */
    ["com.BrightLoop.settings.workspace.storage.unused-blobs.empty"](): string;
    /**
      * `Selected`
      */
    ["com.BrightLoop.settings.workspace.storage.unused-blobs.selected"](): string;
    /**
      * `Delete blob files`
      */
    ["com.BrightLoop.settings.workspace.storage.unused-blobs.delete.title"](): string;
    /**
      * `Are you sure you want to delete these blob files? This action cannot be undone. Make sure you no longer need them before proceeding.`
      */
    ["com.BrightLoop.settings.workspace.storage.unused-blobs.delete.warning"](): string;
    /**
      * `Join Failed`
      */
    ["com.BrightLoop.fail-to-join-workspace.title"](): string;
    /**
      * `Please contact your workspace owner to add more seats.`
      */
    ["com.BrightLoop.fail-to-join-workspace.description-2"](): string;
    /**
      * `Request to join`
      */
    ["com.BrightLoop.request-to-join-workspace.button"](): string;
    /**
      * `Request Sent successfully`
      */
    ["com.BrightLoop.sent-request-to-join-workspace.title"](): string;
    /**
      * `Request failed to send`
      */
    ["com.BrightLoop.failed-to-send-request.title"](): string;
    /**
      * `Readwise`
      */
    ["com.BrightLoop.integration.name.readwise"](): string;
    /**
      * `Integrations`
      */
    ["com.BrightLoop.integration.integrations"](): string;
    /**
      * `Elevate your BrightLoop experience with diverse add-ons and seamless integrations.`
      */
    ["com.BrightLoop.integration.setting.description"](): string;
    /**
      * `Learn how to develop a integration for BrightLoop`
      */
    ["com.BrightLoop.integration.setting.learn"](): string;
    /**
      * `Readwise`
      */
    ["com.BrightLoop.integration.readwise.name"](): string;
    /**
      * `Manually import your content to BrightLoop from Readwise`
      */
    ["com.BrightLoop.integration.readwise.desc"](): string;
    /**
      * `Connect`
      */
    ["com.BrightLoop.integration.readwise.connect"](): string;
    /**
      * `Connect to Readwise`
      */
    ["com.BrightLoop.integration.readwise.connect.title"](): string;
    /**
      * `Paste your access token here`
      */
    ["com.BrightLoop.integration.readwise.connect.placeholder"](): string;
    /**
      * `Please enter a valid access token.`
      */
    ["com.BrightLoop.integration.readwise.connect.input-error"](): string;
    /**
      * `Access Token failed validation`
      */
    ["com.BrightLoop.integration.readwise.connect.error-notify-title"](): string;
    /**
      * `The token could not access Readwise. Please verify access and try again.`
      */
    ["com.BrightLoop.integration.readwise.connect.error-notify-desc"](): string;
    /**
      * `Import`
      */
    ["com.BrightLoop.integration.readwise.import"](): string;
    /**
      * `Disconnect`
      */
    ["com.BrightLoop.integration.readwise.disconnect"](): string;
    /**
      * `Disconnect Readwise?`
      */
    ["com.BrightLoop.integration.readwise.disconnect.title"](): string;
    /**
      * `Once disconnected, content will no longer be imported. Do you want to keep your existing highlights in BrightLoop?`
      */
    ["com.BrightLoop.integration.readwise.disconnect.desc"](): string;
    /**
      * `Keep`
      */
    ["com.BrightLoop.integration.readwise.disconnect.keep"](): string;
    /**
      * `Delete`
      */
    ["com.BrightLoop.integration.readwise.disconnect.delete"](): string;
    /**
      * `Highlights to be imported this time`
      */
    ["com.BrightLoop.integration.readwise.import.title"](): string;
    /**
      * `Importing everything from the start`
      */
    ["com.BrightLoop.integration.readwise.import.desc-from-start"](): string;
    /**
      * `Content`
      */
    ["com.BrightLoop.integration.readwise.import.cell-h-content"](): string;
    /**
      * `Todo`
      */
    ["com.BrightLoop.integration.readwise.import.cell-h-todo"](): string;
    /**
      * `Last update on Readwise`
      */
    ["com.BrightLoop.integration.readwise.import.cell-h-time"](): string;
    /**
      * `New`
      */
    ["com.BrightLoop.integration.readwise.import.todo-new"](): string;
    /**
      * `Skip`
      */
    ["com.BrightLoop.integration.readwise.import.todo-skip"](): string;
    /**
      * `Updated`
      */
    ["com.BrightLoop.integration.readwise.import.todo-update"](): string;
    /**
      * `No highlights needs to be imported`
      */
    ["com.BrightLoop.integration.readwise.import.empty"](): string;
    /**
      * `Importing...`
      */
    ["com.BrightLoop.integration.readwise.import.importing"](): string;
    /**
      * `Please keep this app active until it's finished`
      */
    ["com.BrightLoop.integration.readwise.import.importing-desc"](): string;
    /**
      * `Stop Importing`
      */
    ["com.BrightLoop.integration.readwise.import.importing-stop"](): string;
    /**
      * `Importing aborted`
      */
    ["com.BrightLoop.integration.readwise.import.abort-notify-title"](): string;
    /**
      * `Import aborted, with {{finished}} highlights processed`
      */
    ["com.BrightLoop.integration.readwise.import.abort-notify-desc"](options: {
        readonly finished: string;
    }): string;
    /**
      * `Configuration`
      */
    ["com.BrightLoop.integration.readwise.setting.caption"](): string;
    /**
      * `New Readwise highlights will be imported to BrightLoop `
      */
    ["com.BrightLoop.integration.readwise.setting.sync-new-name"](): string;
    /**
      * `New highlights in Readwise will be synced to BrightLoop `
      */
    ["com.BrightLoop.integration.readwise.setting.sync-new-desc"](): string;
    /**
      * `Updates to Readwise highlights will be imported`
      */
    ["com.BrightLoop.integration.readwise.setting.update-name"](): string;
    /**
      * `Enable this, so that we will process updates of existing highlights from Readwise `
      */
    ["com.BrightLoop.integration.readwise.setting.update-desc"](): string;
    /**
      * `How do we handle updates`
      */
    ["com.BrightLoop.integration.readwise.setting.update-strategy"](): string;
    /**
      * `Append new version to the end`
      */
    ["com.BrightLoop.integration.readwise.setting.update-append-name"](): string;
    /**
      * `Cited or modified highlights will have future versions added to the end of them`
      */
    ["com.BrightLoop.integration.readwise.setting.update-append-desc"](): string;
    /**
      * `Overwrite with new version`
      */
    ["com.BrightLoop.integration.readwise.setting.update-override-name"](): string;
    /**
      * `Cited or modified highlights will be overwritten if there are future updates`
      */
    ["com.BrightLoop.integration.readwise.setting.update-override-desc"](): string;
    /**
      * `Start Importing`
      */
    ["com.BrightLoop.integration.readwise.setting.start-import-name"](): string;
    /**
      * `Using the settings above`
      */
    ["com.BrightLoop.integration.readwise.setting.start-import-desc"](): string;
    /**
      * `Import`
      */
    ["com.BrightLoop.integration.readwise.setting.start-import-button"](): string;
    /**
      * `Apply tags to highlight imports`
      */
    ["com.BrightLoop.integration.readwise.setting.tags-label"](): string;
    /**
      * `Click to add tags`
      */
    ["com.BrightLoop.integration.readwise.setting.tags-placeholder"](): string;
    /**
      * `Author`
      */
    ["com.BrightLoop.integration.readwise-prop.author"](): string;
    /**
      * `Source`
      */
    ["com.BrightLoop.integration.readwise-prop.source"](): string;
    /**
      * `Created`
      */
    ["com.BrightLoop.integration.readwise-prop.created"](): string;
    /**
      * `Updated`
      */
    ["com.BrightLoop.integration.readwise-prop.updated"](): string;
    /**
      * `Integration properties`
      */
    ["com.BrightLoop.integration.properties"](): string;
    /**
      * `Notes`
      */
    ["com.BrightLoop.audio.notes"](): string;
    /**
      * `Transcribing`
      */
    ["com.BrightLoop.audio.transcribing"](): string;
    /**
      * `Unable to retrieve AI results for others`
      */
    ["com.BrightLoop.audio.transcribe.non-owner.confirm.title"](): string;
    /**
      * `Audio activity`
      */
    ["com.BrightLoop.recording.new"](): string;
    /**
      * `Finished`
      */
    ["com.BrightLoop.recording.success.prompt"](): string;
    /**
      * `Open app`
      */
    ["com.BrightLoop.recording.success.button"](): string;
    /**
      * `Failed to save`
      */
    ["com.BrightLoop.recording.failed.prompt"](): string;
    /**
      * `Open file`
      */
    ["com.BrightLoop.recording.failed.button"](): string;
    /**
      * `{{appName}}'s audio`
      */
    ["com.BrightLoop.recording.recording"](options: {
        readonly appName: string;
    }): string;
    /**
      * `Audio recording`
      */
    ["com.BrightLoop.recording.recording.unnamed"](): string;
    /**
      * `Start`
      */
    ["com.BrightLoop.recording.start"](): string;
    /**
      * `Dismiss`
      */
    ["com.BrightLoop.recording.dismiss"](): string;
    /**
      * `Stop`
      */
    ["com.BrightLoop.recording.stop"](): string;
    /**
      * `An internal error occurred.`
      */
    ["error.INTERNAL_SERVER_ERROR"](): string;
    /**
      * `Network error.`
      */
    ["error.NETWORK_ERROR"](): string;
    /**
      * `Too many requests.`
      */
    ["error.TOO_MANY_REQUEST"](): string;
    /**
      * `Resource not found.`
      */
    ["error.NOT_FOUND"](): string;
    /**
      * `Bad request.`
      */
    ["error.BAD_REQUEST"](): string;
    /**
      * `GraphQL bad request, code: {{code}}, {{message}}`
      */
    ["error.GRAPHQL_BAD_REQUEST"](options: Readonly<{
        code: string;
        message: string;
    }>): string;
    /**
      * `HTTP request error, message: {{message}}`
      */
    ["error.HTTP_REQUEST_ERROR"](options: {
        readonly message: string;
    }): string;
    /**
      * `Email service is not configured.`
      */
    ["error.EMAIL_SERVICE_NOT_CONFIGURED"](): string;
    /**
      * `Query is too long, max length is {{max}}.`
      */
    ["error.QUERY_TOO_LONG"](options: {
        readonly max: string;
    }): string;
    /**
      * `Validation error, errors: {{errors}}`
      */
    ["error.VALIDATION_ERROR"](options: {
        readonly errors: string;
    }): string;
    /**
      * `User not found.`
      */
    ["error.USER_NOT_FOUND"](): string;
    /**
      * `User avatar not found.`
      */
    ["error.USER_AVATAR_NOT_FOUND"](): string;
    /**
      * `This email has already been registered.`
      */
    ["error.EMAIL_ALREADY_USED"](): string;
    /**
      * `You are trying to update your account email to the same as the old one.`
      */
    ["error.SAME_EMAIL_PROVIDED"](): string;
    /**
      * `Wrong user email or password: {{email}}`
      */
    ["error.WRONG_SIGN_IN_CREDENTIALS"](options: {
        readonly email: string;
    }): string;
    /**
      * `Unknown authentication provider {{name}}.`
      */
    ["error.UNKNOWN_OAUTH_PROVIDER"](options: {
        readonly name: string;
    }): string;
    /**
      * `OAuth state expired, please try again.`
      */
    ["error.OAUTH_STATE_EXPIRED"](): string;
    /**
      * `Invalid callback state parameter.`
      */
    ["error.INVALID_OAUTH_CALLBACK_STATE"](): string;
    /**
      * `Invalid callback code parameter, provider response status: {{status}} and body: {{body}}.`
      */
    ["error.INVALID_OAUTH_CALLBACK_CODE"](options: Readonly<{
        status: string;
        body: string;
    }>): string;
    /**
      * `Invalid auth state. You might start the auth progress from another device.`
      */
    ["error.INVALID_AUTH_STATE"](): string;
    /**
      * `Missing query parameter `{{name}}`.`
      */
    ["error.MISSING_OAUTH_QUERY_PARAMETER"](options: {
        readonly name: string;
    }): string;
    /**
      * `The third-party account has already been connected to another user.`
      */
    ["error.OAUTH_ACCOUNT_ALREADY_CONNECTED"](): string;
    /**
      * `An invalid email provided: {{email}}`
      */
    ["error.INVALID_EMAIL"](options: {
        readonly email: string;
    }): string;
    /**
      * `Password must be between {{min}} and {{max}} characters`
      */
    ["error.INVALID_PASSWORD_LENGTH"](options: Readonly<{
        min: string;
        max: string;
    }>): string;
    /**
      * `Password is required.`
      */
    ["error.PASSWORD_REQUIRED"](): string;
    /**
      * `You are trying to sign in by a different method than you signed up with.`
      */
    ["error.WRONG_SIGN_IN_METHOD"](): string;
    /**
      * `You don't have early access permission. Visit https://community.BrightLoop Workspace/c/insider-general/ for more information.`
      */
    ["error.EARLY_ACCESS_REQUIRED"](): string;
    /**
      * `You are not allowed to sign up.`
      */
    ["error.SIGN_UP_FORBIDDEN"](): string;
    /**
      * `The email token provided is not found.`
      */
    ["error.EMAIL_TOKEN_NOT_FOUND"](): string;
    /**
      * `An invalid email token provided.`
      */
    ["error.INVALID_EMAIL_TOKEN"](): string;
    /**
      * `The link has expired.`
      */
    ["error.LINK_EXPIRED"](): string;
    /**
      * `You must sign in first to access this resource.`
      */
    ["error.AUTHENTICATION_REQUIRED"](): string;
    /**
      * `You are not allowed to perform this action.`
      */
    ["error.ACTION_FORBIDDEN"](): string;
    /**
      * `You do not have permission to access this resource.`
      */
    ["error.ACCESS_DENIED"](): string;
    /**
      * `You must verify your email before accessing this resource.`
      */
    ["error.EMAIL_VERIFICATION_REQUIRED"](): string;
    /**
      * `Space {{spaceId}} permission not found.`
      */
    ["error.WORKSPACE_PERMISSION_NOT_FOUND"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `Space {{spaceId}} not found.`
      */
    ["error.SPACE_NOT_FOUND"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `Member not found in Space {{spaceId}}.`
      */
    ["error.MEMBER_NOT_FOUND_IN_SPACE"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `You should join in Space {{spaceId}} before broadcasting messages.`
      */
    ["error.NOT_IN_SPACE"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `You have already joined in Space {{spaceId}}.`
      */
    ["error.ALREADY_IN_SPACE"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `You do not have permission to access Space {{spaceId}}.`
      */
    ["error.SPACE_ACCESS_DENIED"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `Owner of Space {{spaceId}} not found.`
      */
    ["error.SPACE_OWNER_NOT_FOUND"](options: {
        readonly spaceId: string;
    }): string;
    /**
      * `Space should have only one owner.`
      */
    ["error.SPACE_SHOULD_HAVE_ONLY_ONE_OWNER"](): string;
    /**
      * `Owner can not leave the workspace.`
      */
    ["error.OWNER_CAN_NOT_LEAVE_WORKSPACE"](): string;
    /**
      * `You can not revoke your own permission.`
      */
    ["error.CAN_NOT_REVOKE_YOURSELF"](): string;
    /**
      * `Doc {{docId}} under Space {{spaceId}} not found.`
      */
    ["error.DOC_NOT_FOUND"](options: Readonly<{
        docId: string;
        spaceId: string;
    }>): string;
    /**
      * `You do not have permission to perform {{action}} action on doc {{docId}}.`
      */
    ["error.DOC_ACTION_DENIED"](options: Readonly<{
        action: string;
        docId: string;
    }>): string;
    /**
      * `Doc {{docId}} under Space {{spaceId}} is blocked from updating.`
      */
    ["error.DOC_UPDATE_BLOCKED"](options: Readonly<{
        docId: string;
        spaceId: string;
    }>): string;
    /**
      * `Your client with version {{version}} is rejected by remote sync server. Please upgrade to {{serverVersion}}.`
      */
    ["error.VERSION_REJECTED"](options: Readonly<{
        version: string;
        serverVersion: string;
    }>): string;
    /**
      * `Invalid doc history timestamp provided.`
      */
    ["error.INVALID_HISTORY_TIMESTAMP"](): string;
    /**
      * `History of {{docId}} at {{timestamp}} under Space {{spaceId}}.`
      */
    ["error.DOC_HISTORY_NOT_FOUND"](options: Readonly<{
        docId: string;
        timestamp: string;
        spaceId: string;
    }>): string;
    /**
      * `Blob {{blobId}} not found in Space {{spaceId}}.`
      */
    ["error.BLOB_NOT_FOUND"](options: Readonly<{
        blobId: string;
        spaceId: string;
    }>): string;
    /**
      * `Expected to publish a doc, not a Space.`
      */
    ["error.EXPECT_TO_PUBLISH_DOC"](): string;
    /**
      * `Expected to revoke a public doc, not a Space.`
      */
    ["error.EXPECT_TO_REVOKE_PUBLIC_DOC"](): string;
    /**
      * `Expect grant roles on doc {{docId}} under Space {{spaceId}}, not a Space.`
      */
    ["error.EXPECT_TO_GRANT_DOC_USER_ROLES"](options: Readonly<{
        docId: string;
        spaceId: string;
    }>): string;
    /**
      * `Expect revoke roles on doc {{docId}} under Space {{spaceId}}, not a Space.`
      */
    ["error.EXPECT_TO_REVOKE_DOC_USER_ROLES"](options: Readonly<{
        docId: string;
        spaceId: string;
    }>): string;
    /**
      * `Expect update roles on doc {{docId}} under Space {{spaceId}}, not a Space.`
      */
    ["error.EXPECT_TO_UPDATE_DOC_USER_ROLE"](options: Readonly<{
        docId: string;
        spaceId: string;
    }>): string;
    /**
      * `Doc is not public.`
      */
    ["error.DOC_IS_NOT_PUBLIC"](): string;
    /**
      * `Failed to store doc updates.`
      */
    ["error.FAILED_TO_SAVE_UPDATES"](): string;
    /**
      * `Failed to store doc snapshot.`
      */
    ["error.FAILED_TO_UPSERT_SNAPSHOT"](): string;
    /**
      * `A Team workspace is required to perform this action.`
      */
    ["error.ACTION_FORBIDDEN_ON_NON_TEAM_WORKSPACE"](): string;
    /**
      * `Doc default role can not be owner.`
      */
    ["error.DOC_DEFAULT_ROLE_CAN_NOT_BE_OWNER"](): string;
    /**
      * `Can not batch grant doc owner permissions.`
      */
    ["error.CAN_NOT_BATCH_GRANT_DOC_OWNER_PERMISSIONS"](): string;
    /**
      * `Unsupported subscription plan: {{plan}}.`
      */
    ["error.UNSUPPORTED_SUBSCRIPTION_PLAN"](options: {
        readonly plan: string;
    }): string;
    /**
      * `Failed to create checkout session.`
      */
    ["error.FAILED_TO_CHECKOUT"](): string;
    /**
      * `Invalid checkout parameters provided.`
      */
    ["error.INVALID_CHECKOUT_PARAMETERS"](): string;
    /**
      * `You have already subscribed to the {{plan}} plan.`
      */
    ["error.SUBSCRIPTION_ALREADY_EXISTS"](options: {
        readonly plan: string;
    }): string;
    /**
      * `Invalid subscription parameters provided.`
      */
    ["error.INVALID_SUBSCRIPTION_PARAMETERS"](): string;
    /**
      * `You didn't subscribe to the {{plan}} plan.`
      */
    ["error.SUBSCRIPTION_NOT_EXISTS"](options: {
        readonly plan: string;
    }): string;
    /**
      * `Your subscription has already been canceled.`
      */
    ["error.SUBSCRIPTION_HAS_BEEN_CANCELED"](): string;
    /**
      * `Your subscription has not been canceled.`
      */
    ["error.SUBSCRIPTION_HAS_NOT_BEEN_CANCELED"](): string;
    /**
      * `Your subscription has expired.`
      */
    ["error.SUBSCRIPTION_EXPIRED"](): string;
    /**
      * `Your subscription has already been in {{recurring}} recurring state.`
      */
    ["error.SAME_SUBSCRIPTION_RECURRING"](options: {
        readonly recurring: string;
    }): string;
    /**
      * `Failed to create customer portal session.`
      */
    ["error.CUSTOMER_PORTAL_CREATE_FAILED"](): string;
    /**
      * `You are trying to access a unknown subscription plan.`
      */
    ["error.SUBSCRIPTION_PLAN_NOT_FOUND"](): string;
    /**
      * `You cannot update an onetime payment subscription.`
      */
    ["error.CANT_UPDATE_ONETIME_PAYMENT_SUBSCRIPTION"](): string;
    /**
      * `A workspace is required to checkout for team subscription.`
      */
    ["error.WORKSPACE_ID_REQUIRED_FOR_TEAM_SUBSCRIPTION"](): string;
    /**
      * `Workspace id is required to update team subscription.`
      */
    ["error.WORKSPACE_ID_REQUIRED_TO_UPDATE_TEAM_SUBSCRIPTION"](): string;
    /**
      * `Copilot session not found.`
      */
    ["error.COPILOT_SESSION_NOT_FOUND"](): string;
    /**
      * `Copilot session has been deleted.`
      */
    ["error.COPILOT_SESSION_DELETED"](): string;
    /**
      * `No copilot provider available.`
      */
    ["error.NO_COPILOT_PROVIDER_AVAILABLE"](): string;
    /**
      * `Failed to generate text.`
      */
    ["error.COPILOT_FAILED_TO_GENERATE_TEXT"](): string;
    /**
      * `Failed to create chat message.`
      */
    ["error.COPILOT_FAILED_TO_CREATE_MESSAGE"](): string;
    /**
      * `Unsplash is not configured.`
      */
    ["error.UNSPLASH_IS_NOT_CONFIGURED"](): string;
    /**
      * `Action has been taken, no more messages allowed.`
      */
    ["error.COPILOT_ACTION_TAKEN"](): string;
    /**
      * `Doc {{docId}} not found.`
      */
    ["error.COPILOT_DOC_NOT_FOUND"](options: {
        readonly docId: string;
    }): string;
    /**
      * `Some docs not found.`
      */
    ["error.COPILOT_DOCS_NOT_FOUND"](): string;
    /**
      * `Copilot message {{messageId}} not found.`
      */
    ["error.COPILOT_MESSAGE_NOT_FOUND"](options: {
        readonly messageId: string;
    }): string;
    /**
      * `Copilot prompt {{name}} not found.`
      */
    ["error.COPILOT_PROMPT_NOT_FOUND"](options: {
        readonly name: string;
    }): string;
    /**
      * `Copilot prompt is invalid.`
      */
    ["error.COPILOT_PROMPT_INVALID"](): string;
    /**
      * `Provider {{provider}} failed with {{kind}} error: {{message}}`
      */
    ["error.COPILOT_PROVIDER_SIDE_ERROR"](options: Readonly<{
        provider: string;
        kind: string;
        message: string;
    }>): string;
    /**
      * `Invalid copilot context {{contextId}}.`
      */
    ["error.COPILOT_INVALID_CONTEXT"](options: {
        readonly contextId: string;
    }): string;
    /**
      * `File {{fileName}} is not supported to use as context: {{message}}`
      */
    ["error.COPILOT_CONTEXT_FILE_NOT_SUPPORTED"](options: Readonly<{
        fileName: string;
        message: string;
    }>): string;
    /**
      * `Failed to modify context {{contextId}}: {{message}}`
      */
    ["error.COPILOT_FAILED_TO_MODIFY_CONTEXT"](options: Readonly<{
        contextId: string;
        message: string;
    }>): string;
    /**
      * `Failed to match context {{contextId}} with "%7B%7Bcontent%7D%7D": {{message}}`
      */
    ["error.COPILOT_FAILED_TO_MATCH_CONTEXT"](options: Readonly<{
        contextId: string;
        message: string;
    }>): string;
    /**
      * `Embedding feature is disabled, please contact the administrator to enable it in the workspace settings.`
      */
    ["error.COPILOT_EMBEDDING_DISABLED"](): string;
    /**
      * `Embedding feature not available, you may need to install pgvector extension to your database`
      */
    ["error.COPILOT_EMBEDDING_UNAVAILABLE"](): string;
    /**
      * `Transcription job already exists`
      */
    ["error.COPILOT_TRANSCRIPTION_JOB_EXISTS"](): string;
    /**
      * `Transcription job not found.`
      */
    ["error.COPILOT_TRANSCRIPTION_JOB_NOT_FOUND"](): string;
    /**
      * `Audio not provided.`
      */
    ["error.COPILOT_TRANSCRIPTION_AUDIO_NOT_PROVIDED"](): string;
    /**
      * `You have exceeded your blob size quota.`
      */
    ["error.BLOB_QUOTA_EXCEEDED"](): string;
    /**
      * `You have exceeded your storage quota.`
      */
    ["error.STORAGE_QUOTA_EXCEEDED"](): string;
    /**
      * `You have exceeded your workspace member quota.`
      */
    ["error.MEMBER_QUOTA_EXCEEDED"](): string;
    /**
      * `You have reached the limit of actions in this workspace, please upgrade your plan.`
      */
    ["error.COPILOT_QUOTA_EXCEEDED"](): string;
    /**
      * `Runtime config {{key}} not found.`
      */
    ["error.RUNTIME_CONFIG_NOT_FOUND"](options: {
        readonly key: string;
    }): string;
    /**
      * `Invalid runtime config type  for '{{key}}', want '{{want}}', but get {{get}}.`
      */
    ["error.INVALID_RUNTIME_CONFIG_TYPE"](options: Readonly<{
        key: string;
        want: string;
        get: string;
    }>): string;
    /**
      * `Mailer service is not configured.`
      */
    ["error.MAILER_SERVICE_IS_NOT_CONFIGURED"](): string;
    /**
      * `Cannot delete all admin accounts.`
      */
    ["error.CANNOT_DELETE_ALL_ADMIN_ACCOUNT"](): string;
    /**
      * `Cannot delete own account.`
      */
    ["error.CANNOT_DELETE_OWN_ACCOUNT"](): string;
    /**
      * `Captcha verification failed.`
      */
    ["error.CAPTCHA_VERIFICATION_FAILED"](): string;
    /**
      * `Invalid session id to generate license key.`
      */
    ["error.INVALID_LICENSE_SESSION_ID"](): string;
    /**
      * `License key has been revealed. Please check your mail box of the one provided during checkout.`
      */
    ["error.LICENSE_REVEALED"](): string;
    /**
      * `Workspace already has a license applied.`
      */
    ["error.WORKSPACE_LICENSE_ALREADY_EXISTS"](): string;
    /**
      * `License not found.`
      */
    ["error.LICENSE_NOT_FOUND"](): string;
    /**
      * `Invalid license to activate.`
      */
    ["error.INVALID_LICENSE_TO_ACTIVATE"](): string;
    /**
      * `Invalid license update params. {{reason}}`
      */
    ["error.INVALID_LICENSE_UPDATE_PARAMS"](options: {
        readonly reason: string;
    }): string;
    /**
      * `You cannot downgrade the workspace from team workspace because there are more than {{limit}} members that are currently active.`
      */
    ["error.WORKSPACE_MEMBERS_EXCEED_LIMIT_TO_DOWNGRADE"](options: {
        readonly limit: string;
    }): string;
    /**
      * `Unsupported client with version [{{clientVersion}}], required version is [{{requiredVersion}}].`
      */
    ["error.UNSUPPORTED_CLIENT_VERSION"](options: Readonly<{
        clientVersion: string;
        requiredVersion: string;
    }>): string;
    /**
      * `Notification not found.`
      */
    ["error.NOTIFICATION_NOT_FOUND"](): string;
    /**
      * `Mentioned user can not access doc {{docId}}.`
      */
    ["error.MENTION_USER_DOC_ACCESS_DENIED"](options: {
        readonly docId: string;
    }): string;
    /**
      * `You can not mention yourself.`
      */
    ["error.MENTION_USER_ONESELF_DENIED"](): string;
    /**
      * `Invalid app config.`
      */
    ["error.INVALID_APP_CONFIG"](): string;
} { const { t } = useTranslation(); return useMemo(() => createProxy((key) => t.bind(null, key)), [t]); }
function createComponent(i18nKey: string) {
    return (props) => createElement(Trans, { i18nKey, shouldUnescape: true, ...props });
}
export const TypedTrans: {
    /**
      * `Go to <a>{{link}}</a> for learn more details about BrightLoop AI.`
      */
    ["com.BrightLoop.ai-onboarding.general.5.description"]: ComponentType<TypedTransProps<{
        readonly link: string;
    }, {
        a: JSX.Element;
    }>>;
    /**
      * `By continuing, you are agreeing to our <a>AI Terms</a>.`
      */
    ["com.BrightLoop.ai-onboarding.general.privacy"]: ComponentType<TypedTransProps<Readonly<{}>, {
        a: JSX.Element;
    }>>;
    /**
      * `Opening <1>BrightLoop</1> app now`
      */
    ["com.BrightLoop.auth.open.BrightLoop Workspacempt"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `This doc is now opened in <1>BrightLoop</1> app`
      */
    ["com.BrightLoop.auth.open.BrightLoop.open-doc-prompt"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `To continue signing in, please enter the code that was sent to <a>{{email}}</a>.`
      */
    ["com.BrightLoop.auth.sign.auth.code.hint"]: ComponentType<TypedTransProps<{
        readonly email: string;
    }, {
        a: JSX.Element;
    }>>;
    /**
      * `Or <1>sign in with password</1> instead.`
      */
    ["com.BrightLoop.auth.sign.auth.code.message.password"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `The Self-Hosted instance is not hosted or deployed by BrightLoop. Your data will be stored on these instances.  <1>Learn more about Self-Host details.</1>`
      */
    ["com.BrightLoop.auth.sign.add-selfhosted.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `By clicking â€œContinue with Google/Emailâ€ above, you acknowledge that you agree to BrightLoop's <1>Terms of Conditions</1> and <3>Privacy Policy</3>.`
      */
    ["com.BrightLoop.auth.sign.message"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
        ["3"]: JSX.Element;
    }>>;
    /**
      * `This demo is limited. <1>Download the BrightLoop Client</1> for the latest features and Performance.`
      */
    ["com.BrightLoop.banner.content"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> selected`
    
      * - com.BrightLoop.collection.toolbar.selected_one: `<0>{{count}}</0> collection selected`
    
      * - com.BrightLoop.collection.toolbar.selected_other: `<0>{{count}}</0> collection(s) selected`
      */
    ["com.BrightLoop.collection.toolbar.selected"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> collection selected`
      */
    ["com.BrightLoop.collection.toolbar.selected_one"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> collection(s) selected`
      */
    ["com.BrightLoop.collection.toolbar.selected_other"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> collection(s) selected`
      */
    ["com.BrightLoop.collection.toolbar.selected_others"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `Deleting <1>{{tag}}</1> cannot be undone, please proceed with caution.`
      */
    ["com.BrightLoop.delete-tags.confirm.description"]: ComponentType<TypedTransProps<{
        readonly tag: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Selected <1>{{selectedCount}}</1>, filtered <3>{{filteredCount}}</3>`
      */
    ["com.BrightLoop.editCollection.rules.countTips"]: ComponentType<TypedTransProps<Readonly<{
        selectedCount: string;
        filteredCount: string;
    }>, {
        ["1"]: JSX.Element;
        ["3"]: JSX.Element;
    }>>;
    /**
      * `Showing <1>{{count}}</1> docs.`
      */
    ["com.BrightLoop.editCollection.rules.countTips.more"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Showing <1>{{count}}</1> doc.`
      */
    ["com.BrightLoop.editCollection.rules.countTips.one"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Showing <1>{{count}}</1> docs.`
      */
    ["com.BrightLoop.editCollection.rules.countTips.zero"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Please <1>add rules</1> to save this collection or switch to <3>Docs</3>, use manual selection mode`
      */
    ["com.BrightLoop.editCollection.rules.empty.noRules.tips"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
        ["3"]: JSX.Element;
    }>>;
    /**
      * `Docs that meet the rules will be added to the current collection <2>{{highlight}}</2>`
      */
    ["com.BrightLoop.editCollection.rules.tips"]: ComponentType<TypedTransProps<{
        readonly highlight: string;
    }, {
        ["2"]: JSX.Element;
    }>>;
    /**
      * `If you are still experiencing this issue, please <1>contact us through the community</1>.`
      */
    ["com.BrightLoop.error.contact-us"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `With the workspace creator's free account, every member can access up to <1>7 days<1> of version history.`
      */
    ["com.BrightLoop.history.confirm-restore-modal.free-plan-prompt.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `With the workspace creator's Pro account, every member enjoys the privilege of accessing up to <1>30 days<1> of version history.`
      */
    ["com.BrightLoop.history.confirm-restore-modal.pro-plan-prompt.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> selected`
    
      * - com.BrightLoop.page.toolbar.selected_one: `<0>{{count}}</0> doc selected`
    
      * - com.BrightLoop.page.toolbar.selected_other: `<0>{{count}}</0> doc(s) selected`
      */
    ["com.BrightLoop.page.toolbar.selected"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> doc selected`
      */
    ["com.BrightLoop.page.toolbar.selected_one"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> doc(s) selected`
      */
    ["com.BrightLoop.page.toolbar.selected_other"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> doc(s) selected`
      */
    ["com.BrightLoop.page.toolbar.selected_others"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `You are currently on the <a>free plan</a>.`
      */
    ["com.BrightLoop.payment.billing-setting.ai.free-desc"]: ComponentType<TypedTransProps<Readonly<{}>, {
        a: JSX.Element;
    }>>;
    /**
      * `You have purchased <a>Believer plan</a>. Enjoy with your benefits!`
      */
    ["com.BrightLoop.payment.billing-setting.believer.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        a: JSX.Element;
    }>>;
    /**
      * `You are currently on the <1>{{planName}} plan</1>.`
      */
    ["com.BrightLoop.payment.billing-setting.current-plan.description"]: ComponentType<TypedTransProps<{
        readonly planName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `You are currently on the believer <1>{{planName}} plan</1>.`
      */
    ["com.BrightLoop.payment.billing-setting.current-plan.description.lifetime"]: ComponentType<TypedTransProps<{
        readonly planName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `You are currently on the monthly <1>{{planName}} plan</1>.`
      */
    ["com.BrightLoop.payment.billing-setting.current-plan.description.monthly"]: ComponentType<TypedTransProps<{
        readonly planName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `You are currently on the annually <1>{{planName}} plan</1>.`
      */
    ["com.BrightLoop.payment.billing-setting.current-plan.description.yearly"]: ComponentType<TypedTransProps<{
        readonly planName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `One-time Purchase. Personal use rights for up to 150 years. <a>Fair Usage Policies</a> may apply.`
      */
    ["com.BrightLoop.payment.lifetime.caption-2"]: ComponentType<TypedTransProps<Readonly<{}>, {
        a: JSX.Element;
    }>>;
    /**
      * `You are currently on the {{currentPlan}} plan. If you have any questions, please contact our <3>customer support</3>.`
      */
    ["com.BrightLoop.payment.subtitle-active"]: ComponentType<TypedTransProps<{
        readonly currentPlan: string;
    }, {
        ["3"]: JSX.Element;
    }>>;
    /**
      * `If you have any questions, please contact our <1> customer support</1>.`
      */
    ["com.BrightLoop.payment.upgrade-success-page.support"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `If you have any questions, please contact our <1>customer support</1>.`
      */
    ["com.BrightLoop.payment.upgrade-success-page.team.text-2"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `If you have any questions, please contact our <1>customer support</1>.`
      */
    ["com.BrightLoop.payment.license-success.text-2"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `This action deletes the old Favorites section. <b>Your documents are safe</b>, ensure you've moved your frequently accessed documents to the new personal Favorites section.`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.clean-all.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        b: JSX.Element;
    }>>;
    /**
      * `<b>Your documents are safe</b>, but you'll need to re-pin your most-used ones. "Favorites" are now personal. Move items from the old shared section to your new personal section or remove the old one by clicking "Empty the old favorites" now.`
      */
    ["com.BrightLoop.rootAppSidebar.migration-data.help.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        b: JSX.Element;
    }>>;
    /**
      * `No doc titles contain <1>{{search}}</1>`
      */
    ["com.BrightLoop.selectPage.empty.tips"]: ComponentType<TypedTransProps<{
        readonly search: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Don't have the app? <1>Click to download</1>.`
      */
    ["com.BrightLoop.open-in-app.card.subtitle"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Settings changed; please restart the app. <1>Restart</1>`
      */
    ["com.BrightLoop.settings.editorSettings.general.spell-check.restart-hint"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Love our app? <1>Star us on GitHub</1> and <2>create issues</2> for your valuable feedback!`
      */
    ["com.BrightLoop.settings.suggestion-2"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `Utilize the meeting notes and AI summarization features provided by BrightLoop. <1>Discuss more in the community</1>.`
      */
    ["com.BrightLoop.settings.meetings.enable.description"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `If you encounter any issues, please contact our <1>customer support</1>. No license yet? <2>Click to purchase</2>.`
      */
    ["com.BrightLoop.settings.workspace.license.activate-modal.tips"]: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `The "<1>{{ name }}</1>" property will be removed. This action cannot be undone.`
      */
    ["com.BrightLoop.settings.workspace.properties.delete-property-desc"]: ComponentType<TypedTransProps<{
        readonly name: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> doc`
      */
    ["com.BrightLoop.settings.workspace.properties.doc"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> docs`
      */
    ["com.BrightLoop.settings.workspace.properties.doc_others"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `Manage workspace <1>{{name}}</1> properties`
      */
    ["com.BrightLoop.settings.workspace.properties.header.subtitle"]: ComponentType<TypedTransProps<{
        readonly name: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> selected`
    
      * - com.BrightLoop.tag.toolbar.selected_one: `<0>{{count}}</0> tag selected`
    
      * - com.BrightLoop.tag.toolbar.selected_other: `<0>{{count}}</0> tag(s) selected`
      */
    ["com.BrightLoop.tag.toolbar.selected"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> tag selected`
      */
    ["com.BrightLoop.tag.toolbar.selected_one"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> tag(s) selected`
      */
    ["com.BrightLoop.tag.toolbar.selected_other"]: ComponentType<TypedTransProps<{
        readonly count: string | number | bigint;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `<0>{{count}}</0> tag(s) selected`
      */
    ["com.BrightLoop.tag.toolbar.selected_others"]: ComponentType<TypedTransProps<{
        readonly count: string;
    }, {
        ["0"]: JSX.Element;
    }>>;
    /**
      * `Deleting <1>{{workspace}}</1> cannot be undone, please proceed with caution. All contents will be lost.`
      */
    ["com.BrightLoop.workspaceDelete.description"]: ComponentType<TypedTransProps<{
        readonly workspace: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Deleting <1>{{workspace}}</1> will delete both local and cloud data, this operation cannot be undone, please proceed with caution.`
      */
    ["com.BrightLoop.workspaceDelete.description2"]: ComponentType<TypedTransProps<{
        readonly workspace: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * ` We recommend the <1>Chrome</1> browser for optimal experience.`
      */
    recommendBrowser: ComponentType<TypedTransProps<Readonly<{}>, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `Are you sure you want to upgrade <1>{{workspaceName}}</1> to a Team Workspace? This will allow unlimited members to collaborate in this workspace.`
      */
    ["com.BrightLoop.upgrade-to-team-page.upgrade-confirm.description"]: ComponentType<TypedTransProps<{
        readonly workspaceName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> mentioned you in <2>{{docTitle}}</2>`
      */
    ["com.BrightLoop.notification.mention"]: ComponentType<TypedTransProps<Readonly<{
        username: string;
        docTitle: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> has accept your invitation`
      */
    ["com.BrightLoop.notification.invitation-accepted"]: ComponentType<TypedTransProps<{
        readonly username: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> has requested to join <2>{{workspaceName}}</2>`
      */
    ["com.BrightLoop.notification.invitation-review-request"]: ComponentType<TypedTransProps<Readonly<{
        username: string;
        workspaceName: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> has declined your request to join <2>{{workspaceName}}</2>`
      */
    ["com.BrightLoop.notification.invitation-review-declined"]: ComponentType<TypedTransProps<Readonly<{
        username: string;
        workspaceName: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> has approved your request to join <2>{{workspaceName}}</2>`
      */
    ["com.BrightLoop.notification.invitation-review-approved"]: ComponentType<TypedTransProps<Readonly<{
        username: string;
        workspaceName: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `There is an issue regarding your invitation to <1>{{workspaceName}}</1> `
      */
    ["com.BrightLoop.notification.invitation-blocked"]: ComponentType<TypedTransProps<{
        readonly workspaceName: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
    /**
      * `<1>{{username}}</1> invited you to join <2>{{workspaceName}}</2>`
      */
    ["com.BrightLoop.notification.invitation"]: ComponentType<TypedTransProps<Readonly<{
        username: string;
        workspaceName: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `Unable to join <1/> <2>{{workspaceName}}</2> due to insufficient seats available.`
      */
    ["com.BrightLoop.fail-to-join-workspace.description-1"]: ComponentType<TypedTransProps<{
        readonly workspaceName: string;
    }, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
    }>>;
    /**
      * `You requested to join <1/> <2>{{workspaceName}}</2> with <3>{{userEmail}}</3>, the workspace owner and team admins will review your request.`
      */
    ["com.BrightLoop.sent-request-to-join-workspace.description"]: ComponentType<TypedTransProps<Readonly<{
        workspaceName: string;
        userEmail: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
        ["3"]: JSX.Element;
    }>>;
    /**
      * `Unable to process your request to join <1/> <2>{{workspaceName}}</2> with <3>{{userEmail}}</3>, the workspace has reached its member limit. Please contact the workspace owner for available seats.`
      */
    ["com.BrightLoop.failed-to-send-request.description"]: ComponentType<TypedTransProps<Readonly<{
        workspaceName: string;
        userEmail: string;
    }>, {
        ["1"]: JSX.Element;
        ["2"]: JSX.Element;
        ["3"]: JSX.Element;
    }>>;
    /**
      * `Import your Readwise highlights to BrightLoop. Please visit Readwise, <br />click <a>"Get Access Token"</a>, and paste the token below.`
      */
    ["com.BrightLoop.integration.readwise.connect.desc"]: ComponentType<TypedTransProps<Readonly<{}>, {
        br: JSX.Element;
        a: JSX.Element;
    }>>;
    /**
      * `Updates to be imported since last successful import on {{lastImportedAt}} <a>Import everything instead</a>`
      */
    ["com.BrightLoop.integration.readwise.import.desc-from-last"]: ComponentType<TypedTransProps<{
        readonly lastImportedAt: string;
    }, {
        a: JSX.Element;
    }>>;
    /**
      * `Please contact <1>{{user}}</1> to upgrade AI rights or resend the attachment.`
      */
    ["com.BrightLoop.audio.transcribe.non-owner.confirm.message"]: ComponentType<TypedTransProps<{
        readonly user: string;
    }, {
        ["1"]: JSX.Element;
    }>>;
} = /*#__PURE__*/ createProxy(createComponent);

import DeltaChat, { C } from 'deltachat-node'
import { getLogger } from '../../shared/logger'

import SplitOut from './splitout'
import { DCContact } from '../../shared/shared-types'

const log = getLogger('main/deltachat/contacts')

export default class DCContacts extends SplitOut {
  unblockContact(contactId: number) {
    const contact = this.selectedAccountContext.getContact(contactId)
    this.selectedAccountContext.blockContact(contactId, false)
    const name = contact.getNameAndAddress()
    log.info(`Unblocked contact ${name} (id = ${contactId})`)
  }

  blockContact(contactId: number) {
    const contact = this.selectedAccountContext.getContact(contactId)
    this.selectedAccountContext.blockContact(contactId, true)
    const name = contact.getNameAndAddress()
    log.debug(`Blocked contact ${name} (id = ${contactId})`)
  }

  changeNickname(contactId: number, name: string) {
    const contact = this.selectedAccountContext.getContact(contactId)
    const address = contact.getAddress()
    const result = this.selectedAccountContext.createContact(name, address)

    // trigger interface updates
    const chatId = this.getChatIdByContactId(contactId)
    this._controller.chatList.onChatModified(chatId)

    // TODO implement chat changed event in the core on name change
    return result
  }

  createContact(email: string, name?: string) {
    if (!DeltaChat.maybeValidAddr(email)) {
      throw new Error(this._controller.translate('bad_email_address'))
    }
    return this.selectedAccountContext.createContact(name || '', email)
  }

  createChatByContactId(contactId: number) {
    const contact = this.selectedAccountContext.getContact(contactId)
    if (!contact) {
      log.warn(`no contact could be found with id ${contactId}`)
      return 0
    }
    const chatId = this.selectedAccountContext.createChatByContactId(contactId)
    log.debug(`created chat ${chatId} with contact' ${contactId}`)
    const chat = this.selectedAccountContext.getChat(chatId)
    if (chat && chat.getVisibility() === C.DC_CHAT_VISIBILITY_ARCHIVED) {
      log.debug('chat was archived, unarchiving it')
      this.selectedAccountContext.setChatVisibility(chatId, C.DC_CHAT_VISIBILITY_NORMAL)
    }
    this._controller.chatList.updateChatList()
    this._controller.chatList.selectChat(chatId)
    return chatId
  }

  getContact(contactId: number) {
    return this.selectedAccountContext.getContact(contactId).toJson()
  }

  getChatIdByContactId(contactId: number) {
    return this.selectedAccountContext.getChatIdByContactId(contactId)
  }

  /** Gets the direct message chat id with this contact and creates it if it doesn't exist yet */
  getDMChatId(contactId: number) {
    const existingChatId = this.selectedAccountContext.getChatIdByContactId(contactId)
    if (existingChatId !== 0) {
      return existingChatId
    }
    const newChatId = this.selectedAccountContext.createChatByContactId(contactId)
    if (newChatId !== 0) {
      return newChatId
    } else {
      throw new Error('Could not create chat with contact ' + contactId)
    }
  }

  getContactIds(listFlags: number, queryStr: string): number[] {
    return (
      this.selectedAccountContext
        .getContacts(listFlags, queryStr)
        // deduplicate the items here until its fixed in the core: see https://github.com/deltachat/deltachat-core-rust/issues/2552
        .filter(function (item: number, pos: number, ary: number[]) {
          return !pos || item != ary[pos - 1]
        })
    )
  }

  _getDCContact(id: number) {
    const contact = this.selectedAccountContext.getContact(id).toJson()
    return { ...contact }
  }

  getContacts(ids: number[]) {
    const result: { [id: number]: DCContact } = {}
    for (const id of ids) {
      result[id] = this._getDCContact(id)
    }
    return result
  }

  getEncryptionInfo(contactId: number) {
    return this.selectedAccountContext.getContactEncryptionInfo(contactId)
  }

  lookupContactIdByAddr(email: string): number {
    if (!DeltaChat.maybeValidAddr(email)) {
      throw new Error(this._controller.translate('bad_email_address'))
    }
    return this.selectedAccountContext.lookupContactIdByAddr(email)
  }
}

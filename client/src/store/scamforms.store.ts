import { IScamForm } from '@/types'
import { makeAutoObservable } from 'mobx'

class ScamFormsStore {
    forms: IScamForm[] = []
    selectedForm: IScamForm | null = null

    constructor() {
        makeAutoObservable(this)
    }

    setForms = (forms: IScamForm[]) => {
        this.forms = forms
    }

    setSelectedForm = (form: IScamForm | null) => {
        this.selectedForm = form
    }

    updateFormVotes = (formId: string, likes: number, dislikes: number, userVote: 'LIKE' | 'DISLIKE' | null) => {
        const formIndex = this.forms.findIndex(form => form.id === formId)
        if (formIndex !== -1) {
            this.forms[formIndex] = {
                ...this.forms[formIndex],
                likes,
                dislikes
            }
        }

        if (this.selectedForm && this.selectedForm.id === formId) {
            this.selectedForm = {
                ...this.selectedForm,
                likes,
                dislikes
            }
        }
    }

    getFormById = (formId: string): IScamForm | undefined => {
        return this.forms.find(form => form.id === formId)
    }
}

export default new ScamFormsStore() 
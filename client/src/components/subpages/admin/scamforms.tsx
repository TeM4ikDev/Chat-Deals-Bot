import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { onRequest } from "@/utils/handleReq"
import { useEffect, useState } from "react"
import { PageContainer } from "../../layout/PageContainer"

export const ScamForms: React.FC = () => {
  const { userStore: { user } } = useStore()
  const [scamForms, setScamForms] = useState([])
  const [isLoading, setIsLoading] = useState(false)


  const getScamForms = async () => {
    setIsLoading(true)

    const data = await onRequest(AdminService.getAllScamForms())
    console.log(data)
    if (data) {
        setScamForms(data.users)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    getScamForms()
  }, [])

  return (
    <PageContainer title="Гаранты" loading={false} itemsStart returnPage>
        <></>
      
    </PageContainer>
  )
}

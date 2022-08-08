#shellcheck shell=sh

Describe "Snyk iac test command"
  Before snyk_login
  After snyk_logout

  Describe "iac test"
    It "downloads the legacy rules"
      When run snyk iac test ./fixtures/sg_open_ssh.tf
      The status should be failure # issues found
      The output should include "Snyk Infrastructure as Code"
      The output should include "Issues"
    End
  End

  Describe "iac test --experimental"
      It "downloads the legacy rules and engine executable"
        When run snyk iac test ./fixtures/terraform/sg_open_ssh.tf --experimental
        The status should be success # no issues found because new bundle does not contain many rules
        The output should include "Snyk Infrastructure as Code"
        The output should include "Issues"
      End
  End
End
